"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tag } from "lucide-react";

import { validateCoupon, type ValidateCouponSuccess } from "@/app/actions/coupon-actions";
import {
  CheckoutForm,
  type B2BBillingDetails,
} from "@/components/dashboard/billing/checkout-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PENDING_INVOICE_MESSAGE } from "@/lib/billing/checkout-rules";
import type { BillingPeriod } from "@/lib/utils/pricing";
import { formatPriceByn } from "@/lib/utils/pricing";

type CheckoutClientProps = {
  organizationId: string;
  organizationBrandName: string;
  tierId: string;
  tierName: string;
  period: BillingPeriod;
  periodLabel: string;
  baseTotalKopecks: number;
  bonusDays: number;
  isUpgrade: boolean;
  checkoutError: string | null;
  tierDiscountPercent: number;
  initialB2BDetails?: B2BBillingDetails | null;
  hasPendingInvoice: boolean;
};

export function CheckoutClient({
  organizationId,
  organizationBrandName,
  tierId,
  tierName,
  period,
  periodLabel,
  baseTotalKopecks,
  bonusDays,
  isUpgrade,
  checkoutError,
  tierDiscountPercent,
  initialB2BDetails,
  hasPendingInvoice,
}: CheckoutClientProps) {
  const [promoInput, setPromoInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponSuccess | null>(
    null,
  );
  const [isApplying, startApplyTransition] = useTransition();

  const finalTotalKopecks = appliedCoupon?.newPrice ?? baseTotalKopecks;
  const hasPromoDiscount = appliedCoupon !== null && appliedCoupon.discountAmount > 0;

  function handleApplyPromo() {
    if (hasPendingInvoice) {
      toast.error(PENDING_INVOICE_MESSAGE);
      return;
    }

    const code = promoInput.trim();
    if (!code) {
      toast.error("Введите промокод");
      return;
    }

    startApplyTransition(async () => {
      const result = await validateCoupon(code, baseTotalKopecks);

      if (!result.success) {
        setAppliedCoupon(null);
        toast.error(result.message);
        return;
      }

      setAppliedCoupon(result);
      setPromoInput(result.code);
      toast.success(result.message);
    });
  }

  function handleRemovePromo() {
    setAppliedCoupon(null);
    setPromoInput("");
    toast.message("Промокод снят");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
      {hasPendingInvoice ? (
        <Alert variant="destructive" className="lg:col-span-2">
          <AlertDescription>{PENDING_INVOICE_MESSAGE}</AlertDescription>
        </Alert>
      ) : null}

      {!checkoutError && isUpgrade && bonusDays > 0 ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 lg:col-span-2 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50">
          <AlertDescription>
            Бонус за остаток текущего тарифа: +{bonusDays} дней.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Ваш заказ</CardTitle>
          <CardDescription>Сводка по выбранному тарифу</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <p className="font-semibold">{tierName}</p>
              <p className="text-muted-foreground text-sm">{periodLabel}</p>
            </div>
            <p
              className={
                hasPromoDiscount
                  ? "text-muted-foreground text-lg font-bold line-through"
                  : "text-lg font-bold"
              }
            >
              {formatPriceByn(
                hasPromoDiscount ? baseTotalKopecks : finalTotalKopecks,
              )}
            </p>
          </div>

          {tierDiscountPercent > 0 ? (
            <p className="text-brand text-sm font-medium">
              Скидка {tierDiscountPercent}% за период оплаты
            </p>
          ) : null}

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Tag className="text-muted-foreground size-4" aria-hidden />
              <p className="text-sm font-medium">У меня есть промокод</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="promo-code" className="sr-only">
                  Промокод
                </Label>
                <Input
                  id="promo-code"
                  value={promoInput}
                  onChange={(event) =>
                    setPromoInput(event.target.value.toUpperCase())
                  }
                  placeholder="START2026"
                  className="uppercase"
                  disabled={isApplying || Boolean(appliedCoupon)}
                />
              </div>
              {appliedCoupon ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemovePromo}
                  disabled={isApplying}
                >
                  Снять
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleApplyPromo}
                  disabled={isApplying}
                >
                  {isApplying ? "Проверка…" : "Применить"}
                </Button>
              )}
            </div>
            {appliedCoupon ? (
              <p className="text-brand text-sm">
                Промокод {appliedCoupon.code} применён
              </p>
            ) : null}
          </div>

          <dl className="text-muted-foreground space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Неофициальное название (Бренд)</dt>
              <dd className="text-foreground text-right font-medium">
                {organizationBrandName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Период</dt>
              <dd className="text-foreground font-medium">{periodLabel}</dd>
            </div>
            {hasPromoDiscount ? (
              <div className="flex justify-between gap-4">
                <dt>Скидка по промокоду</dt>
                <dd className="text-brand font-medium">
                  −{formatPriceByn(appliedCoupon.discountAmount)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t pt-2">
              <dt className="text-foreground font-semibold">Итого к оплате</dt>
              <dd className="text-foreground text-lg font-bold">
                {formatPriceByn(finalTotalKopecks)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Способ оплаты</CardTitle>
          <CardDescription>
            Оплата картой или выставление счёта для юридического лица
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckoutForm
            organizationId={organizationId}
            tierId={tierId}
            period={period}
            initialB2BDetails={initialB2BDetails}
            couponId={appliedCoupon?.couponId ?? null}
            validationError={checkoutError}
            hasPendingInvoice={hasPendingInvoice}
          />
        </CardContent>
      </Card>
    </div>
  );
}
