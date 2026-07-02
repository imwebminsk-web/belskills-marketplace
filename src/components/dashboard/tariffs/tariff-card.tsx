"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, Cpu, Gift } from "lucide-react";
import { toast } from "sonner";

import type { TariffRow } from "@/app/actions/tariff-actions";
import type { BillingPeriod } from "@/components/dashboard/tariffs/tariffs-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PENDING_INVOICE_MESSAGE } from "@/lib/billing/checkout-rules";
import {
  buildTierLimitLines,
  resolveTariffPriceKopecks,
} from "@/lib/tariffs/format-tier-limits";
import {
  formatPriceByn,
  getDiscountedPriceInRubles,
  kopecksToRubles,
  rublesToKopecks,
} from "@/lib/utils/pricing";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database.types";

type TariffCardProps = {
  tariff: TariffRow;
  period: BillingPeriod;
  currentTierId: string | null;
  currentTierPrice: number;
  hasUsedTrial: boolean;
  hasPendingInvoice?: boolean;
  checkoutBlockReason?: string | null;
};

type TariffButtonState = {
  label: string;
  isHardBlocked: boolean;
  useBrand: boolean;
  navigatesToCheckout: boolean;
};

function resolveTariffButtonState(
  tariff: TariffRow,
  currentTierId: string | null,
  currentTierPrice: number,
  hasUsedTrial: boolean,
): TariffButtonState {
  const cardPrice = resolveTariffPriceKopecks(tariff);

  if (tariff.id === "trial") {
    const trialBlocked =
      hasUsedTrial || (currentTierId !== null && currentTierId !== "free");

    if (trialBlocked) {
      return {
        label: "Уже использован",
        isHardBlocked: true,
        useBrand: false,
        navigatesToCheckout: false,
      };
    }

    return {
      label: "Попробовать",
      isHardBlocked: false,
      useBrand: true,
      navigatesToCheckout: false,
    };
  }

  if (tariff.id === "free" || cardPrice === 0) {
    const onPaidTier = currentTierPrice > 0;

    if (onPaidTier) {
      return {
        label: "Недоступно",
        isHardBlocked: true,
        useBrand: false,
        navigatesToCheckout: false,
      };
    }

    if (currentTierId === "free") {
      return {
        label: "Текущий тариф",
        isHardBlocked: true,
        useBrand: false,
        navigatesToCheckout: false,
      };
    }

    return {
      label: "Активировать",
      isHardBlocked: false,
      useBrand: false,
      navigatesToCheckout: false,
    };
  }

  if (cardPrice === currentTierPrice) {
    return {
      label: "Продлить",
      isHardBlocked: false,
      useBrand: true,
      navigatesToCheckout: true,
    };
  }

  if (cardPrice > currentTierPrice) {
    return {
      label: "Улучшить",
      isHardBlocked: false,
      useBrand: true,
      navigatesToCheckout: true,
    };
  }

  return {
    label: "Перейти",
    isHardBlocked: false,
    useBrand: true,
    navigatesToCheckout: true,
  };
}

function getDiscountPercent(tariff: TariffRow, period: BillingPeriod): number {
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

function parseStringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: typeof Cpu;
  title: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <h3 className="text-center text-sm font-semibold tracking-wide uppercase">
        {title}
      </h3>
    </div>
  );
}

export function TariffCard({
  tariff,
  period,
  currentTierId,
  currentTierPrice,
  hasUsedTrial,
  hasPendingInvoice = false,
  checkoutBlockReason = null,
}: TariffCardProps) {
  const router = useRouter();
  const discountPercent = getDiscountPercent(tariff, period);
  const monthlyRubles = getDiscountedPriceInRubles(
    tariff.price_monthly,
    discountPercent,
  );
  const originalMonthlyRubles = kopecksToRubles(tariff.price_monthly);
  const totalRubles = monthlyRubles * period;
  const originalTotalRubles = originalMonthlyRubles * period;
  const hasDiscount = discountPercent > 0 && originalMonthlyRubles > monthlyRubles;
  const features = parseStringArray(tariff.features);
  const presents = parseStringArray(tariff.presents);
  const limitsText = parseStringArray(tariff.limits_text);
  const limitsLines =
    limitsText.length > 0
      ? limitsText
      : buildTierLimitLines(tariff.limits, tariff.category);
  const buttonState = resolveTariffButtonState(
    tariff,
    currentTierId,
    currentTierPrice,
    hasUsedTrial,
  );

  const checkoutHref = `/dashboard/checkout?tier=${encodeURIComponent(tariff.id)}&period=${period}`;

  function handleCheckoutClick() {
    if (hasPendingInvoice) {
      toast.error(PENDING_INVOICE_MESSAGE);
      return;
    }

    if (checkoutBlockReason) {
      toast.error(checkoutBlockReason);
      return;
    }

    router.push(checkoutHref);
  }

  const showCheckoutButton =
    buttonState.navigatesToCheckout &&
    resolveTariffPriceKopecks(tariff) > 0 &&
    tariff.id !== "trial";

  return (
    <Card className="relative flex h-full flex-col overflow-hidden py-0">
      {hasDiscount ? (
        <span className="absolute top-3 right-3 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow-sm">
          −{discountPercent}%
        </span>
      ) : null}

      <CardContent className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-4">
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold tracking-tight">{tariff.name}</h2>
          {tariff.description ? (
            <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
              {tariff.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 text-center">
          <p className="text-4xl font-bold tracking-tight md:text-5xl">
            {formatPriceByn(rublesToKopecks(totalRubles))}
          </p>
          {hasDiscount ? (
            <p className="text-muted-foreground text-base">
              <span className="line-through">
                {formatPriceByn(rublesToKopecks(originalTotalRubles))}
              </span>
            </p>
          ) : null}
          <p className="text-muted-foreground text-sm">
            {monthlyRubles === 0
              ? "Бесплатно"
              : `${formatPriceByn(rublesToKopecks(monthlyRubles))} / месяц`}
          </p>
        </div>

        {limitsLines.length > 0 ? (
          <section className="space-y-3 border-t pt-4">
            <SectionHeading icon={Cpu} title="Лимиты" />
            <ul className="space-y-2.5 text-left">
              {limitsLines.map((limit) => (
                <li
                  key={`${tariff.id}-limit-${limit}`}
                  className="flex gap-2.5 text-sm leading-snug"
                >
                  <CheckCircle
                    className="text-brand mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {features.length > 0 ? (
          <section className="space-y-3 border-t pt-4">
            <SectionHeading icon={CheckCircle} title="Функционал" />
            <ul className="space-y-2.5 text-left">
              {features.map((feature) => (
                <li
                  key={`${tariff.id}-feature-${feature}`}
                  className="flex gap-2.5 text-sm leading-snug"
                >
                  <CheckCircle
                    className="text-brand mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {presents.length > 0 ? (
          <section className="space-y-3 border-t pt-4">
            <SectionHeading icon={Gift} title="Бонусы" />
            <ul className="space-y-2 text-left">
              {presents.map((present) => (
                <li
                  key={`${tariff.id}-present-${present}`}
                  className={cn(
                    "flex gap-2.5 rounded-lg border border-accent/25 bg-accent/8 px-3 py-2.5 text-sm leading-snug",
                  )}
                >
                  <Gift className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{present}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>

      <CardFooter className="mt-auto border-t px-5 py-5">
        {showCheckoutButton ? (
          <Button
            type="button"
            onClick={handleCheckoutClick}
            className={cn(
              "h-11 w-full text-base font-semibold",
              buttonState.useBrand &&
                "bg-brand text-brand-foreground hover:bg-brand/90",
            )}
          >
            {hasPendingInvoice ? "Ожидает оплаты счёта" : buttonState.label}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={buttonState.isHardBlocked}
            variant={buttonState.useBrand ? "default" : "secondary"}
            className={cn(
              "h-11 w-full text-base font-semibold",
              buttonState.useBrand &&
                "bg-brand text-brand-foreground hover:bg-brand/90",
              buttonState.isHardBlocked && "text-muted-foreground",
            )}
          >
            {buttonState.label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
