// @ts-expect-error Vitest запускается через pnpm dlx (без локального пакета в devDependencies).
import { describe, expect, it } from "vitest";

import {
  BASE_TIER_PRICE,
  CORP_ISOLATION_ERROR,
  calculateBonusDays,
  getCoefficient,
  validateCheckoutTransition,
} from "./billing-math";

function futureExpiry(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

describe("getCoefficient", () => {
  it("returns price relative to BASE_TIER_PRICE", () => {
    expect(getCoefficient(BASE_TIER_PRICE)).toBe(1);
    expect(getCoefficient(9000)).toBe(3);
    expect(getCoefficient(0)).toBe(0);
  });
});

describe("calculateBonusDays", () => {
  it("converts remaining time using tier price ratios on upgrade", () => {
    const result = calculateBonusDays({
      currentTierId: "catalog_basic",
      nextTierId: "catalog_pro",
      currentTierExpiresAt: futureExpiry(30),
      currentTierMonthlyKopecks: 3000,
      nextTierMonthlyKopecks: 9000,
    });

    expect(result.isUpgrade).toBe(true);
    expect(result.remainingDays).toBe(30);
    expect(result.bonusDays).toBe(10);
  });

  it("returns zero bonus days when it is not an upgrade", () => {
    const downgrade = calculateBonusDays({
      currentTierId: "catalog_pro",
      nextTierId: "catalog_basic",
      currentTierExpiresAt: futureExpiry(30),
      currentTierMonthlyKopecks: 9000,
      nextTierMonthlyKopecks: 3000,
    });

    expect(downgrade.isUpgrade).toBe(false);
    expect(downgrade.bonusDays).toBe(0);

    const sameTier = calculateBonusDays({
      currentTierId: "catalog_basic",
      nextTierId: "catalog_basic",
      currentTierExpiresAt: futureExpiry(30),
      currentTierMonthlyKopecks: 3000,
      nextTierMonthlyKopecks: 3000,
    });

    expect(sameTier.bonusDays).toBe(0);
  });

  it("does not apply monetary discount — bonus days only", () => {
    const result = calculateBonusDays({
      currentTierId: "lms_school",
      nextTierId: "lms_university",
      currentTierExpiresAt: futureExpiry(15),
      currentTierMonthlyKopecks: 9000,
      nextTierMonthlyKopecks: 18000,
    });

    expect(result.bonusDays).toBe(7);
    expect(result).not.toHaveProperty("appliedDiscountKopecks");
    expect(result).not.toHaveProperty("finalTotalKopecks");
  });
});

describe("validateCheckoutTransition", () => {
  const baseInput = {
    currentTierId: "current",
    nextTierId: "next",
    currentTierExpiresAt: futureExpiry(20),
    currentTierMonthlyKopecks: 3000,
    nextTierMonthlyKopecks: 9000,
    nextTierLimits: { max_courses: 12 } as const,
    currentCourseCount: 2,
    totalLessonCount: 0,
  };

  it("blocks transitions between corporate and non-corporate tiers", () => {
    const corpToCatalog = validateCheckoutTransition({
      ...baseInput,
      currentTierCategory: "corporate",
      nextTierCategory: "catalog",
    });

    expect(corpToCatalog.error).toBe(CORP_ISOLATION_ERROR);

    const catalogToCorp = validateCheckoutTransition({
      ...baseInput,
      currentTierCategory: "catalog",
      nextTierCategory: "corp",
    });

    expect(catalogToCorp.error).toBe(CORP_ISOLATION_ERROR);
  });

  it("blocks checkout when course count exceeds the new tier limit", () => {
    const result = validateCheckoutTransition({
      ...baseInput,
      currentTierCategory: "lms",
      nextTierCategory: "catalog",
      nextTierLimits: { max_courses: 3 },
      currentCourseCount: 5,
      totalLessonCount: 0,
    });

    expect(result.error).toBe(
      "У вас 5 курсов. Лимит нового тарифа — 3. Удалите навсегда 2 курсов для перехода.",
    );
  });

  it("blocks LMS to catalog downgrade when lessons still exist", () => {
    const result = validateCheckoutTransition({
      ...baseInput,
      currentTierCategory: "lms",
      nextTierCategory: "catalog",
      currentCourseCount: 1,
      totalLessonCount: 4,
    });

    expect(result.error).toBe(
      "Тарифы Каталога не поддерживают обучение. Удалите абсолютно все уроки из базы для перехода.",
    );
  });

  it("allows valid upgrades and returns bonus days without blocking error", () => {
    const result = validateCheckoutTransition({
      ...baseInput,
      currentTierCategory: "catalog",
      nextTierCategory: "catalog",
      currentTierExpiresAt: futureExpiry(30),
      currentTierMonthlyKopecks: 3000,
      nextTierMonthlyKopecks: 9000,
    });

    expect(result.error).toBeNull();
    expect(result.isUpgrade).toBe(true);
    expect(result.bonusDays).toBe(10);
  });
});
