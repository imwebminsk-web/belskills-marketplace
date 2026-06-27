/** Копейки → целые BYN (округление до ближайшего рубля). */
export function kopecksToRubles(kopecks: number): number {
  return Math.round(kopecks / 100);
}

/** Целые BYN → копейки для хранения в БД. */
export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100);
}

/**
 * Цена со скидкой в целых BYN.
 * Сначала считаем в копейках, затем округляем до ближайшего рубля.
 */
export function getDiscountedPriceInRubles(
  basePriceKopecks: number,
  discountPercent: number,
): number {
  const discountedKopecks = basePriceKopecks * (1 - discountPercent / 100);
  return Math.round(discountedKopecks / 100);
}

/**
 * Цена со скидкой в копейках для хранения в БД.
 * Скидка применяется в копейках, итог округляется до целого рубля.
 */
export function calculateDiscountedPrice(
  basePriceKopecks: number,
  discountPercent: number,
): number {
  return rublesToKopecks(
    getDiscountedPriceInRubles(basePriceKopecks, discountPercent),
  );
}

/** Форматирование цены из копеек в BYN (целые рубли). */
export function formatPriceByn(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "BYN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecksToRubles(kopecks));
}

export type BillingPeriod = 1 | 3 | 6 | 12;

const BILLING_PERIODS: BillingPeriod[] = [1, 3, 6, 12];

export function parseBillingPeriod(value: unknown): BillingPeriod | null {
  const n = Number(value);
  return BILLING_PERIODS.includes(n as BillingPeriod)
    ? (n as BillingPeriod)
    : null;
}

export function getDiscountPercentForPeriod(
  tier: {
    discount_3_months: number;
    discount_6_months: number;
    discount_12_months: number;
  },
  period: BillingPeriod,
): number {
  switch (period) {
    case 3:
      return tier.discount_3_months;
    case 6:
      return tier.discount_6_months;
    case 12:
      return tier.discount_12_months;
    default:
      return 0;
  }
}

/** Итоговая сумма за период в копейках (со скидкой). */
export function calculateTierTotalKopecks(
  priceMonthlyKopecks: number,
  period: BillingPeriod,
  tier: {
    discount_3_months: number;
    discount_6_months: number;
    discount_12_months: number;
  },
): number {
  const discount = getDiscountPercentForPeriod(tier, period);
  const monthlyKopecks = calculateDiscountedPrice(priceMonthlyKopecks, discount);
  return monthlyKopecks * period;
}
