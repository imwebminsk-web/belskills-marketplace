"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Copy,
  MoreHorizontalIcon,
  Pencil,
  PlusIcon,
  Trash2,
} from "lucide-react";

import {
  deleteCoupon,
  type CouponRow,
} from "@/app/actions/coupon-actions";
import { CouponDialog } from "@/components/dashboard/admin/coupon-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CouponsAdminClientProps = {
  initialCoupons: CouponRow[];
};

function formatDiscount(coupon: CouponRow): string {
  if (coupon.discount_type === "percent") {
    return `${coupon.discount_value}%`;
  }
  return `${coupon.discount_value} руб.`;
}

function formatUsage(coupon: CouponRow): string {
  const limit = coupon.max_uses ?? "∞";
  return `${coupon.used_count} / ${limit}`;
}

function formatExpiresAt(iso: string | null): string {
  if (!iso) {
    return "Бессрочно";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function CouponsAdminClient({
  initialCoupons,
}: CouponsAdminClientProps) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCoupons(initialCoupons);
  }, [initialCoupons]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(coupon: CouponRow) {
    setEditing(coupon);
    setDialogOpen(true);
  }

  function handleSuccess(coupon: CouponRow) {
    setCoupons((prev) => {
      const index = prev.findIndex((item) => item.id === coupon.id);
      if (index === -1) {
        return [coupon, ...prev];
      }
      const next = [...prev];
      next[index] = coupon;
      return next;
    });
    setEditing(null);
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Промокод скопирован");
    } catch {
      toast.error("Не удалось скопировать промокод");
    }
  }

  function handleDelete(coupon: CouponRow) {
    if (
      !window.confirm(
        `Удалить промокод «${coupon.code}»? Это действие необратимо.`,
      )
    ) {
      return;
    }

    setDeletingId(coupon.id);
    startTransition(async () => {
      const result = await deleteCoupon(coupon.id);

      if (!result.success) {
        toast.error(result.error);
        setDeletingId(null);
        return;
      }

      setCoupons((prev) => prev.filter((item) => item.id !== coupon.id));
      toast.success("Промокод удалён");
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {coupons.length} промокод(ов)
        </p>
        <Button type="button" onClick={openCreate}>
          <PlusIcon className="mr-2 size-4" />
          Добавить промокод
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Код</TableHead>
              <TableHead>Скидка</TableHead>
              <TableHead>Использовано / Лимит</TableHead>
              <TableHead>До</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center text-sm"
                >
                  Промокодов пока нет. Создайте первый промокод.
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => {
                const busy = isPending && deletingId === coupon.id;

                return (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium">{coupon.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {coupon.code}
                    </TableCell>
                    <TableCell>{formatDiscount(coupon)}</TableCell>
                    <TableCell>{formatUsage(coupon)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatExpiresAt(coupon.expires_at)}
                    </TableCell>
                    <TableCell>
                      {coupon.is_active ? (
                        <Badge
                          variant="outline"
                          className="border-brand/40 bg-brand/10 text-brand"
                        >
                          Вкл
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Выкл</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={busy}
                            aria-label={`Действия: ${coupon.code}`}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => openEdit(coupon)}
                          >
                            <Pencil className="text-muted-foreground" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleCopyCode(coupon.code)}
                          >
                            <Copy className="text-muted-foreground" />
                            Скопировать код
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            disabled={busy}
                            onClick={() => handleDelete(coupon)}
                          >
                            <Trash2 className="text-destructive" />
                            {busy ? "Удаление…" : "Удалить"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CouponDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
        coupon={editing}
        onSuccess={handleSuccess}
      />
    </>
  );
}
