"use client";

import Link from "next/link";
import { CheckCircle, Cpu, Gift } from "lucide-react";

import type { TariffRow } from "@/app/actions/tariff-actions";
import type { BillingPeriod } from "@/components/dashboard/tariffs/tariffs-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  formatPriceByn,
  getDiscountedPriceInRubles,
  kopecksToRubles,
  rublesToKopecks,
} from "@/lib/utils/pricing";
import type { Json } from "@/types/database.types";
import { cn } from "@/lib/utils";

type TariffCardProps = {
  tariff: TariffRow;
  period: BillingPeriod;
  currentTierId: string | null;
  currentTierPrice: number;
  hasUsedTrial: boolean;
  hasPendingInvoice?: boolean;
};

type TariffButtonState = {
  label: string;
  disabled: boolean;
  useBrand: boolean;
};

function resolveTariffButtonState(
  tariff: TariffRow,
  currentTierId: string | null,
  currentTierPrice: number,
  hasUsedTrial: boolean,
): TariffButtonState {
  const cardPrice = tariff.price_monthly;

  if (tariff.id === "trial") {
    const trialBlocked =
      hasUsedTrial || (currentTierId !== null && currentTierId !== "free");

    if (trialBlocked) {
      return { label: "Уже использован", disabled: true, useBrand: false };
    }

    return { label: "Попробовать", disabled: false, useBrand: true };
  }

  if (tariff.id === "free" || cardPrice === 0) {
    const onPaidTier = currentTierPrice > 0;

    if (onPaidTier) {
      return { label: "Недоступно", disabled: true, useBrand: false };
    }

    if (currentTierId === "free") {
      return { label: "Текущий тариф", disabled: true, useBrand: false };
    }

    return { label: "Активировать", disabled: false, useBrand: false };
  }

  if (cardPrice === currentTierPrice) {
    return { label: "Продлить", disabled: false, useBrand: true };
  }

  if (cardPrice > currentTierPrice) {
    return { label: "Улучшить", disabled: false, useBrand: true };
  }

  return { label: "Даунгрейд недоступен", disabled: true, useBrand: false };
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
}: TariffCardProps) {
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
  const buttonState = resolveTariffButtonState(
    tariff,
    currentTierId,
    currentTierPrice,
    hasUsedTrial,
  );

  const isPaidAction =
    buttonState.useBrand &&
    !buttonState.disabled &&
    tariff.price_monthly > 0 &&
    tariff.id !== "trial" &&
    !hasPendingInvoice;

  const checkoutHref = `/dashboard/checkout?tier=${encodeURIComponent(tariff.id)}&period=${period}`;

  return (
    <Card className="relative flex h-full flex-col overflow-hidden py-0">
      {hasDiscount ? (
        <span className="absolute top-3 right-3 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow-sm">
          −{discountPercent}%
        </span>
      ) : null}

      <CardContent className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-4">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold tracking-tight">{tariff.name}</h2>
          {tariff.description ? (
            <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
              {tariff.description}
            </p>
          ) : null}
        </div>

        {/* Price */}
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

        {/* Limits */}
        {limitsText.length > 0 ? (
          <section className="space-y-3 border-t pt-4">
            <SectionHeading icon={Cpu} title="Лимиты" />
            <ul className="space-y-2.5 text-left">
              {limitsText.map((limit) => (
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

        {/* Features */}
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

        {/* Presents */}
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
        {hasPendingInvoice &&
        buttonState.useBrand &&
        !buttonState.disabled &&
        tariff.price_monthly > 0 &&
        tariff.id !== "trial" ? (
          <Button
            type="button"
            disabled
            className="h-11 w-full text-base font-semibold"
          >
            Ожидает оплаты счёта
          </Button>
        ) : isPaidAction ? (
          <Button
            asChild
            className={cn(
              "h-11 w-full text-base font-semibold",
              "bg-brand text-brand-foreground hover:bg-brand/90",
            )}
          >
            <Link href={checkoutHref}>{buttonState.label}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            disabled={buttonState.disabled}
            variant={buttonState.useBrand ? "default" : "secondary"}
            className={cn(
              "h-11 w-full text-base font-semibold",
              buttonState.useBrand &&
                "bg-brand text-brand-foreground hover:bg-brand/90",
              buttonState.disabled && "text-muted-foreground",
            )}
          >
            {buttonState.label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
