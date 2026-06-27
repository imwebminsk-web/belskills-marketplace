/** Tier weights used for prorated upgrade day conversion (mirrors DB helper). */
export const TIER_WEIGHTS = {
  basic: 1,
  pro: 3,
  premium: 5,
} as const;

export type WeightedTierId = keyof typeof TIER_WEIGHTS;

export function getTierWeight(tierId: string): number {
  if (tierId in TIER_WEIGHTS) {
    return TIER_WEIGHTS[tierId as WeightedTierId];
  }
  return 1;
}

/**
 * Converts remaining days on an old plan into equivalent days on a higher plan.
 * Example: 30 days Basic (1) → Pro (3) = floor(30 * 1 / 3) = 10 days.
 */
export function getUpgradeConversionDays(
  remainingDays: number,
  oldWeight: number,
  newWeight: number,
): number {
  if (remainingDays <= 0 || newWeight <= 0 || oldWeight <= 0) {
    return 0;
  }

  return Math.floor((remainingDays * oldWeight) / newWeight);
}
