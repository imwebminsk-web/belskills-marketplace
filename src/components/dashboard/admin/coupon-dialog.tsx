"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  upsertCoupon,
  type CouponRow,
} from "@/app/actions/coupon-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type CouponDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: CouponRow | null;
  onSuccess?: (coupon: CouponRow) => void;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  return iso.slice(0, 10);
}

export function CouponDialog({
  open,
  onOpenChange,
  coupon,
  onSuccess,
}: CouponDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(coupon);
  const [error, setError] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<CouponRow["discount_type"]>(
    coupon?.discount_type ?? "percent",
  );
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDiscountType(coupon?.discount_type ?? "percent");
      setIsActive(coupon?.is_active ?? true);
      setError(null);
    }
  }, [open, coupon]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await upsertCoupon({
        id: coupon?.id,
        name: String(formData.get("name") ?? ""),
        code: String(formData.get("code") ?? "").toUpperCase(),
        discount_type: discountType,
        discount_value: formData.get("discount_value"),
        max_uses: formData.get("max_uses") || null,
        expires_at: formData.get("expires_at") || null,
        is_active: isActive,
      });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Промокод обновлён" : "Промокод создан");
      onSuccess?.(result.data);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Редактировать: ${coupon?.code}` : "Новый промокод"}
          </DialogTitle>
        </DialogHeader>

        <form
          key={coupon?.id ?? "new"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="coupon-name">Название акции</Label>
            <Input
              id="coupon-name"
              name="name"
              defaultValue={coupon?.name ?? ""}
              required
              placeholder="Старт 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-code">Промокод</Label>
            <Input
              id="coupon-code"
              name="code"
              defaultValue={coupon?.code ?? ""}
              required
              placeholder="START2026"
              className="uppercase"
              onChange={(event) => {
                event.target.value = event.target.value.toUpperCase();
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-discount-type">Тип скидки</Label>
              <Select
                value={discountType}
                onValueChange={(value) =>
                  setDiscountType(value as CouponRow["discount_type"])
                }
              >
                <SelectTrigger id="coupon-discount-type" className="w-full">
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Процент</SelectItem>
                  <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-discount-value">
                {discountType === "percent" ? "Процент (%)" : "Сумма (BYN)"}
              </Label>
              <Input
                id="coupon-discount-value"
                name="discount_value"
                type="number"
                min={0.01}
                max={discountType === "percent" ? 100 : undefined}
                step={discountType === "percent" ? 1 : 0.01}
                defaultValue={coupon?.discount_value ?? ""}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-max-uses">Лимит активаций</Label>
              <Input
                id="coupon-max-uses"
                name="max_uses"
                type="number"
                min={1}
                step={1}
                defaultValue={coupon?.max_uses ?? ""}
                placeholder="Без лимита"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-expires-at">Срок действия</Label>
              <Input
                id="coupon-expires-at"
                name="expires_at"
                type="date"
                defaultValue={toDateInputValue(coupon?.expires_at ?? null)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="coupon-is-active">Активен</Label>
              <p className="text-muted-foreground text-xs">
                Неактивные промокоды скрыты на checkout
              </p>
            </div>
            <Switch
              id="coupon-is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохранение…" : isEditing ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
