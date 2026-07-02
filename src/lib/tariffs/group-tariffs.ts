import type { TariffCategory } from "@/lib/tariffs/format-tier-limits";

export type TariffGroupingInput = {
  id: string;
  price_monthly: number;
  price_monthly_kopecks?: number | null;
  category?: string | null;
};

export function resolveTariffPriceKopecks(
  tariff: Pick<TariffGroupingInput, "price_monthly" | "price_monthly_kopecks">,
): number {
  if (
    typeof tariff.price_monthly_kopecks === "number" &&
    Number.isFinite(tariff.price_monthly_kopecks)
  ) {
    return tariff.price_monthly_kopecks;
  }

  return tariff.price_monthly;
}

export function isFreeTariff(tariff: TariffGroupingInput): boolean {
  const priceKopecks = resolveTariffPriceKopecks(tariff);

  return (
    tariff.id === "trial" ||
    tariff.id === "free" ||
    tariff.category === "free" ||
    priceKopecks === 0
  );
}

export function groupTariffsByCategory<T extends TariffGroupingInput>(
  tariffs: readonly T[],
): Record<TariffCategory, T[]> {
  const groups: Record<TariffCategory, T[]> = {
    catalog: [],
    lms: [],
    corporate: [],
    free: [],
  };

  for (const tariff of tariffs) {
    if (isFreeTariff(tariff)) {
      groups.free.push(tariff);
      continue;
    }

    const category = tariff.category ?? "catalog";

    if (category === "lms") {
      groups.lms.push(tariff);
    } else if (category === "corporate" || category === "corp") {
      groups.corporate.push(tariff);
    } else if (category === "catalog") {
      groups.catalog.push(tariff);
    } else {
      groups.catalog.push(tariff);
    }
  }

  return groups;
}
