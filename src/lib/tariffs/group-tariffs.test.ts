// @ts-expect-error Vitest запускается через pnpm dlx (без локального пакета в devDependencies).
import { describe, expect, it } from "vitest";

import { groupTariffsByCategory, isFreeTariff } from "./group-tariffs";

describe("isFreeTariff", () => {
  it("detects free tiers by id, zero price, category, and alternate price field", () => {
    expect(isFreeTariff({ id: "free", price_monthly: 0, category: null })).toBe(true);
    expect(isFreeTariff({ id: "trial", price_monthly: 100, category: "catalog" })).toBe(
      true,
    );
    expect(
      isFreeTariff({
        id: "starter",
        price_monthly: 100,
        price_monthly_kopecks: 0,
        category: "catalog",
      }),
    ).toBe(true);
    expect(
      isFreeTariff({ id: "legacy", price_monthly: 0, category: "lms" }),
    ).toBe(true);
    expect(
      isFreeTariff({ id: "legacy", price_monthly: 3000, category: "free" }),
    ).toBe(true);
  });
});

describe("groupTariffsByCategory", () => {
  it("groups free tiers separately even without category", () => {
    const groups = groupTariffsByCategory([
      { id: "free", price_monthly: 0, category: null },
      { id: "trial", price_monthly: 0, category: null },
      { id: "catalog_basic", price_monthly: 3000, category: "catalog" },
      { id: "lms_school", price_monthly: 9000, category: "lms" },
      { id: "corp_team", price_monthly: 5000, category: "corporate" },
    ]);

    expect(groups.free.map((tier) => tier.id)).toEqual(["free", "trial"]);
    expect(groups.catalog.map((tier) => tier.id)).toEqual(["catalog_basic"]);
    expect(groups.lms.map((tier) => tier.id)).toEqual(["lms_school"]);
    expect(groups.corporate.map((tier) => tier.id)).toEqual(["corp_team"]);
  });
});
