import { kopecksToRubles, rublesToKopecks } from "@/lib/utils/pricing";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CouponDiscountInput = {
  discount_type: string;
  discount_value: number | string;
};

/** Applies coupon discount; final price floored to whole BYN in client's favor. */
export function applyCouponToPrice(
  originalPriceKopecks: number,
  coupon: CouponDiscountInput,
): { newPrice: number; discountAmount: number } {
  const originalRubles = kopecksToRubles(originalPriceKopecks);
  const discountValue = Number(coupon.discount_value);

  const discountedRubles =
    coupon.discount_type === "percent"
      ? originalRubles * (1 - discountValue / 100)
      : originalRubles - discountValue;

  const flooredRubles = Math.floor(Math.max(0, discountedRubles));
  const newPrice = rublesToKopecks(flooredRubles);
  const discountAmount = Math.max(0, originalPriceKopecks - newPrice);

  return { newPrice, discountAmount };
}

export function buildBillingDescription(
  tierName: string,
  periodMonths: number,
  couponCode?: string | null,
): string {
  const base = `Доступ к платформе BelSkills по тарифу ${tierName} (${periodMonths} мес.)`;

  if (couponCode?.trim()) {
    return `${base}. Промокод - ${couponCode.trim().toUpperCase()}`;
  }

  return base;
}

export const PENDING_INVOICE_MESSAGE =
  "У вас уже выставлен счет, ожидающий оплаты. Оплатите или отмените его в панели управления.";

export const COUPON_ALREADY_USED_MESSAGE = "Вы уже использовали этот промокод.";

export async function organizationHasPendingInvoice(
  supabase: SupabaseServerClient,
  organizationId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("billing_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (error) {
    console.error("[organizationHasPendingInvoice]", error);
    return true;
  }

  return (count ?? 0) > 0;
}

export async function userHasPendingInvoice(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("billing_requests")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .eq("status", "pending");

  if (error) {
    console.error("[userHasPendingInvoice]", error);
    return true;
  }

  return (count ?? 0) > 0;
}
