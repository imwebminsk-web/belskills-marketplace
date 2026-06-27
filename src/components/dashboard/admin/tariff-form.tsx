"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  upsertTariff,
  type TariffRow,
} from "@/app/actions/tariff-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { kopecksToRubles } from "@/lib/utils/pricing";
import type { Json } from "@/types/database.types";

function jsonArrayToLines(value: Json | null | undefined): string {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .join("\n");
}

function limitsToInput(value: Json | null | undefined): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "{}";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

type TariffFormProps = {
  tariff?: TariffRow | null;
  onSuccess?: (row: TariffRow) => void;
  onCancel?: () => void;
};

export function TariffForm({ tariff, onSuccess, onCancel }: TariffFormProps) {
  const isEditing = Boolean(tariff);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(tariff?.is_active ?? true);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (isActive) {
      formData.set("is_active", "true");
    } else {
      formData.delete("is_active");
    }

    startTransition(async () => {
      const result = await upsertTariff(formData);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Тариф обновлён" : "Тариф создан");
      onSuccess?.(result.data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tariff-id">ID</Label>
          <Input
            id="tariff-id"
            name="id"
            defaultValue={tariff?.id ?? ""}
            readOnly={isEditing}
            required
            placeholder="pro"
            className={isEditing ? "bg-muted" : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-name">Название</Label>
          <Input
            id="tariff-name"
            name="name"
            defaultValue={tariff?.name ?? ""}
            required
            placeholder="Pro"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tariff-description">Описание</Label>
        <Textarea
          id="tariff-description"
          name="description"
          defaultValue={tariff?.description ?? ""}
          rows={3}
          placeholder="Краткое описание тарифа для админки и лендинга"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tariff-price">Цена / месяц (BYN)</Label>
          <Input
            id="tariff-price"
            name="price_monthly"
            type="number"
            min={0}
            step={1}
            defaultValue={
              tariff?.price_monthly ? kopecksToRubles(tariff.price_monthly) : 0
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-priority">Приоритет</Label>
          <Input
            id="tariff-priority"
            name="priority_level"
            type="number"
            min={0}
            step={1}
            defaultValue={tariff?.priority_level ?? 0}
            required
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox
            id="tariff-active"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(checked === true)}
          />
          <Label htmlFor="tariff-active" className="cursor-pointer font-normal">
            Активен
          </Label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tariff-discount-3">Скидка 3 мес. (%)</Label>
          <Input
            id="tariff-discount-3"
            name="discount_3_months"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={tariff?.discount_3_months ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-discount-6">Скидка 6 мес. (%)</Label>
          <Input
            id="tariff-discount-6"
            name="discount_6_months"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={tariff?.discount_6_months ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-discount-12">Скидка 12 мес. (%)</Label>
          <Input
            id="tariff-discount-12"
            name="discount_12_months"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={tariff?.discount_12_months ?? 0}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tariff-limits-text">Лимиты (текст для витрины)</Label>
        <Textarea
          id="tariff-limits-text"
          name="limits_text"
          defaultValue={jsonArrayToLines(tariff?.limits_text)}
          rows={5}
          placeholder="One limit per line"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tariff-features">Возможности</Label>
          <Textarea
            id="tariff-features"
            name="features"
            defaultValue={jsonArrayToLines(tariff?.features)}
            rows={6}
            placeholder="One feature per line"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff-presents">Бонусы</Label>
          <Textarea
            id="tariff-presents"
            name="presents"
            defaultValue={jsonArrayToLines(tariff?.presents)}
            rows={6}
            placeholder="One feature per line"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tariff-limits">Лимиты (JSON)</Label>
        <Textarea
          id="tariff-limits"
          name="limits"
          defaultValue={limitsToInput(tariff?.limits)}
          rows={5}
          className="font-mono text-sm"
          placeholder='{"courses": 10, "lessons": 20}'
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Отмена
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Сохранение…" : isEditing ? "Сохранить" : "Создать тариф"}
        </Button>
      </div>
    </form>
  );
}
