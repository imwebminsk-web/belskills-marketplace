import type { Json } from "@/types/database.types";

const DAYS_IN_BILLING_MONTH = 30;

export const BASE_TIER_PRICE = 3000;

export const CORP_ISOLATION_ERROR =
  "Корпоративные тарифы изолированы. Переход невозможен.";

export function getCoefficient(priceKopecks: number): number {
  return priceKopecks / BASE_TIER_PRICE;
}

export function isCorporateTierCategory(
  category: string | null | undefined,
): boolean {
  return category === "corporate" || category === "corp";
}

function getRemainingDaysFromExpiry(
  expiresAt: string | null,
  now: Date = new Date(),
): number {
  if (!expiresAt) {
    return 0;
  }

  const expiresDate = new Date(expiresAt);
  if (Number.isNaN(expiresDate.getTime())) {
    return 0;
  }

  const diffMs = expiresDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export type BonusDaysInput = {
  currentTierId: string | null;
  nextTierId: string;
  currentTierExpiresAt: string | null;
  currentTierMonthlyKopecks: number | null;
  nextTierMonthlyKopecks: number;
};

export type BonusDaysResult = {
  remainingDays: number;
  bonusDays: number;
  isUpgrade: boolean;
};

/**
 * Converts unused time on the current paid tier into bonus days on the new tier.
 * User always pays the full price of the new tier — no monetary discount.
 */
export function calculateBonusDays(input: BonusDaysInput): BonusDaysResult {
  const remainingDays = getRemainingDaysFromExpiry(input.currentTierExpiresAt);

  const isUpgrade =
    Boolean(input.currentTierId) &&
    input.currentTierId !== input.nextTierId &&
    Boolean(input.currentTierMonthlyKopecks) &&
    input.currentTierMonthlyKopecks! > 0 &&
    input.nextTierMonthlyKopecks > input.currentTierMonthlyKopecks!;

  if (!isUpgrade || remainingDays <= 0) {
    return {
      remainingDays,
      bonusDays: 0,
      isUpgrade: false,
    };
  }

  const oldPrice = input.currentTierMonthlyKopecks!;
  const newPrice = input.nextTierMonthlyKopecks;

  const baseDays = remainingDays * getCoefficient(oldPrice);
  const bonusDays = Math.floor(baseDays / getCoefficient(newPrice));

  return {
    remainingDays,
    bonusDays: Math.max(0, bonusDays),
    isUpgrade: true,
  };
}

function parseMaxCourses(limits: Json | null | undefined): number | null {
  if (!limits || typeof limits !== "object" || Array.isArray(limits)) {
    return null;
  }

  const maxCourses = (limits as { max_courses?: unknown }).max_courses;

  if (maxCourses === null || maxCourses === undefined) {
    return null;
  }

  if (typeof maxCourses !== "number" || !Number.isFinite(maxCourses)) {
    return null;
  }

  return maxCourses;
}

export type CheckoutTransitionInput = {
  currentTierId: string | null;
  nextTierId: string;
  currentTierCategory: string | null;
  nextTierCategory: string | null;
  currentTierExpiresAt: string | null;
  currentTierMonthlyKopecks: number | null;
  nextTierMonthlyKopecks: number;
  nextTierLimits: Json | null;
  currentCourseCount: number;
  totalLessonCount: number;
};

export type CheckoutTransitionResult = {
  error: string | null;
  bonusDays: number;
  remainingDays: number;
  isUpgrade: boolean;
};

export function validateCheckoutTransition(
  input: CheckoutTransitionInput,
): CheckoutTransitionResult {
  const bonus = calculateBonusDays({
    currentTierId: input.currentTierId,
    nextTierId: input.nextTierId,
    currentTierExpiresAt: input.currentTierExpiresAt,
    currentTierMonthlyKopecks: input.currentTierMonthlyKopecks,
    nextTierMonthlyKopecks: input.nextTierMonthlyKopecks,
  });

  const currentIsCorp = isCorporateTierCategory(input.currentTierCategory);
  const nextIsCorp = isCorporateTierCategory(input.nextTierCategory);

  if (
    input.currentTierId &&
    input.currentTierId !== input.nextTierId &&
    currentIsCorp !== nextIsCorp
  ) {
    return {
      error: CORP_ISOLATION_ERROR,
      bonusDays: 0,
      remainingDays: bonus.remainingDays,
      isUpgrade: false,
    };
  }

  const newTierCourseLimit = parseMaxCourses(input.nextTierLimits);

  if (
    newTierCourseLimit !== null &&
    input.currentCourseCount > newTierCourseLimit
  ) {
    const coursesToRemove = input.currentCourseCount - newTierCourseLimit;

    return {
      error: `У вас ${input.currentCourseCount} курсов. Лимит нового тарифа — ${newTierCourseLimit}. Удалите навсегда ${coursesToRemove} курсов для перехода.`,
      bonusDays: 0,
      remainingDays: bonus.remainingDays,
      isUpgrade: false,
    };
  }

  const oldIsLms = input.currentTierCategory === "lms";
  const newIsCatalog = input.nextTierCategory === "catalog";

  if (oldIsLms && newIsCatalog && input.totalLessonCount > 0) {
    return {
      error:
        "Тарифы Каталога не поддерживают обучение. Удалите абсолютно все уроки из базы для перехода.",
      bonusDays: 0,
      remainingDays: bonus.remainingDays,
      isUpgrade: false,
    };
  }

  return {
    error: null,
    bonusDays: bonus.bonusDays,
    remainingDays: bonus.remainingDays,
    isUpgrade: bonus.isUpgrade,
  };
}

export function calculateSubscriptionDaysAdded(
  periodMonths: number,
  bonusDays: number,
): number {
  return periodMonths * DAYS_IN_BILLING_MONTH + Math.max(0, bonusDays);
}
