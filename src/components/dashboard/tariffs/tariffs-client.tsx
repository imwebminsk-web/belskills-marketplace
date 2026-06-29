"use client";

import { useMemo, useState } from "react";

import type { TariffRow } from "@/app/actions/tariff-actions";
import { TariffCard } from "@/components/dashboard/tariffs/tariff-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrganizationSubscriptionState } from "@/lib/auth/tenant";
import { PENDING_INVOICE_MESSAGE } from "@/lib/billing/checkout-rules";
import { cn } from "@/lib/utils";
import type { BillingPeriod } from "@/lib/utils/pricing";

export type { BillingPeriod };

const PERIOD_VALUES: BillingPeriod[] = [1, 3, 6, 12];

function sortByPriceAsc(tariffs: TariffRow[]): TariffRow[] {
  return [...tariffs].sort((a, b) => a.price_monthly - b.price_monthly);
}

function discountForPeriod(tariff: TariffRow, period: BillingPeriod): number {
  switch (period) {
    case 3:
      return tariff.discount_3_months;
    case 6:
      return tariff.discount_6_months;
    case 12:
      return tariff.discount_12_months;
    default:
      return 0;
  }
}

function periodToggleLabel(tariffs: TariffRow[], period: BillingPeriod): string {
  const base = period === 1 ? "1 мес." : `${period} мес.`;
  if (tariffs.length === 0) {
    return base;
  }

  const maxDiscount = Math.max(
    0,
    ...tariffs.map((tariff) => discountForPeriod(tariff, period)),
  );

  return maxDiscount > 0 ? `${base} · −${maxDiscount}%` : base;
}

type TariffsClientProps = {
  tariffs: TariffRow[];
  subscriptionState: OrganizationSubscriptionState;
  hasPendingInvoice: boolean;
};

export function TariffsClient({
  tariffs,
  subscriptionState,
  hasPendingInvoice,
}: TariffsClientProps) {
  const [tariffType, setTariffType] = useState<TariffType>("paid");
  const [period, setPeriod] = useState<BillingPeriod>(1);

  const sortedTariffs = useMemo(() => sortByPriceAsc(tariffs), [tariffs]);

  const paidTariffs = useMemo(
    () => sortedTariffs.filter((tariff) => tariff.price_monthly > 0),
    [sortedTariffs],
  );

  const freeTariffs = useMemo(
    () => sortedTariffs.filter((tariff) => tariff.price_monthly === 0),
    [sortedTariffs],
  );

  const visibleTariffs = tariffType === "paid" ? paidTariffs : freeTariffs;

  const currentTierPrice = useMemo(() => {
    if (!subscriptionState.currentTierId) {
      return 0;
    }

    const current = sortedTariffs.find(
      (tariff) => tariff.id === subscriptionState.currentTierId,
    );

    return current?.price_monthly ?? 0;
  }, [sortedTariffs, subscriptionState.currentTierId]);

  const periodLabels = useMemo(
    () =>
      Object.fromEntries(
        PERIOD_VALUES.map((value) => [value, periodToggleLabel(paidTariffs, value)]),
      ) as Record<BillingPeriod, string>,
    [paidTariffs],
  );

  return (
    <div className="flex flex-col gap-10">
      {hasPendingInvoice ? (
        <Alert variant="destructive">
          <AlertDescription>{PENDING_INVOICE_MESSAGE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col items-center gap-6">
        <div className="bg-muted/60 inline-flex rounded-full p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setTariffType("paid")}
            className={cn(
              "min-w-[8rem] rounded-full px-8 py-2.5 text-sm font-semibold transition-colors",
              tariffType === "paid"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Платные
          </button>
          <button
            type="button"
            onClick={() => setTariffType("free")}
            className={cn(
              "min-w-[8rem] rounded-full px-8 py-2.5 text-sm font-semibold transition-colors",
              tariffType === "free"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Бесплатные
          </button>
        </div>

        {tariffType === "paid" ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
              Период оплаты
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {PERIOD_VALUES.map((value) => {
                const isActive = period === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={periodLabels[value]}
                    onClick={() => setPeriod(value)}
                    className={cn(
                      "min-w-[5.5rem] rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
                      isActive
                        ? "border-brand bg-brand text-brand-foreground shadow-sm"
                        : "border-brand text-brand hover:bg-brand/10",
                    )}
                  >
                    {periodLabels[value]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {visibleTariffs.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
          {tariffType === "paid"
            ? "Платные тарифы пока не добавлены."
            : "Бесплатные тарифы пока не добавлены."}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {visibleTariffs.map((tariff) => (
            <TariffCard
              key={tariff.id}
              tariff={tariff}
              period={tariffType === "paid" ? period : 1}
              currentTierId={subscriptionState.currentTierId}
              currentTierPrice={currentTierPrice}
              hasUsedTrial={subscriptionState.hasUsedTrial}
              hasPendingInvoice={hasPendingInvoice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
