"use client";

import { useMemo, useState } from "react";

import type { TariffRow } from "@/app/actions/tariff-actions";
import { TariffCard } from "@/components/dashboard/tariffs/tariff-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrganizationSubscriptionState } from "@/lib/auth/tenant";
import { PENDING_INVOICE_MESSAGE } from "@/lib/billing/checkout-rules";
import {
  groupTariffsByCategory as groupTariffsIntoTabs,
  TARIFF_CATEGORY_TABS,
} from "@/lib/tariffs/format-tier-limits";
import { cn } from "@/lib/utils";
import type { BillingPeriod } from "@/lib/utils/pricing";

export type { BillingPeriod };

const PERIOD_VALUES: BillingPeriod[] = [1, 3, 6, 12];

function sortByPriceAsc(tariffs: TariffRow[]): TariffRow[] {
  return [...tariffs].sort((a, b) => a.price_monthly - b.price_monthly);
}

function sortGroupedByPrice(
  groups: ReturnType<typeof groupTariffsIntoTabs<TariffRow>>,
) {
  return {
    catalog: sortByPriceAsc(groups.catalog),
    lms: sortByPriceAsc(groups.lms),
    corporate: sortByPriceAsc(groups.corporate),
    free: sortByPriceAsc(groups.free),
  };
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
  checkoutBlockReasons?: Record<string, string | null>;
};

export function TariffsClient({
  tariffs,
  subscriptionState,
  hasPendingInvoice,
  checkoutBlockReasons = {},
}: TariffsClientProps) {
  const [period, setPeriod] = useState<BillingPeriod>(1);

  const groupedTariffs = useMemo(
    () => sortGroupedByPrice(groupTariffsIntoTabs(tariffs)),
    [tariffs],
  );

  const currentTierPrice = useMemo(() => {
    if (!subscriptionState.currentTierId) {
      return 0;
    }

    const current = tariffs.find(
      (tariff) => tariff.id === subscriptionState.currentTierId,
    );

    return current?.price_monthly ?? 0;
  }, [tariffs, subscriptionState.currentTierId]);

  const periodLabels = useMemo(
    () =>
      Object.fromEntries(
        PERIOD_VALUES.map((value) => [
          value,
          periodToggleLabel(tariffs, value),
        ]),
      ) as Record<BillingPeriod, string>,
    [tariffs],
  );

  return (
    <div className="flex flex-col gap-10">
      {hasPendingInvoice ? (
        <Alert variant="destructive">
          <AlertDescription>{PENDING_INVOICE_MESSAGE}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="catalog" className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
              Категория тарифа
            </p>
            <TabsList className="flex h-auto w-full max-w-4xl flex-wrap justify-center gap-2 bg-transparent p-0 shadow-none">
              {TARIFF_CATEGORY_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "h-auto min-h-0 flex-none rounded-full border border-brand bg-transparent px-5 py-2 text-sm font-semibold text-brand transition-colors",
                    "hover:bg-brand/10 hover:text-brand",
                    "focus-visible:outline-none",
                    "data-[state=active]:border-brand data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm",
                    "group-data-[variant=default]/tabs-list:data-[state=active]:!border-brand group-data-[variant=default]/tabs-list:data-[state=active]:!bg-brand group-data-[variant=default]/tabs-list:data-[state=active]:!text-brand-foreground group-data-[variant=default]/tabs-list:data-[state=active]:!shadow-sm",
                    "data-active:border-brand data-active:bg-brand data-active:text-brand-foreground data-active:shadow-sm",
                    "group-data-[variant=default]/tabs-list:data-active:!border-brand group-data-[variant=default]/tabs-list:data-active:!bg-brand group-data-[variant=default]/tabs-list:data-active:!text-brand-foreground group-data-[variant=default]/tabs-list:data-active:!shadow-sm",
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

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
        </div>

        {TARIFF_CATEGORY_TABS.map((tab) => {
          const categoryTariffs = groupedTariffs[tab.value];

          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              {categoryTariffs.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
                  Тарифы в категории «{tab.label}» пока не добавлены.
                </div>
              ) : (
                <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
                  {categoryTariffs.map((tariff) => (
                    <TariffCard
                      key={tariff.id}
                      tariff={tariff}
                      period={period}
                      currentTierId={subscriptionState.currentTierId}
                      currentTierPrice={currentTierPrice}
                      hasUsedTrial={subscriptionState.hasUsedTrial}
                      hasPendingInvoice={hasPendingInvoice}
                      checkoutBlockReason={checkoutBlockReasons[tariff.id] ?? null}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
