"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

type ActionError = { success: false; error: string };
type ActionOk = { success: true };

const requestIdSchema = z.string().uuid("Некорректный ID счёта");

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "Требуется вход в систему" };
  }

  const profile = await loadGateProfile(user.id);

  if (!profile) {
    return { success: false as const, error: "Профиль не найден" };
  }

  if (!isGlobalAdmin(profile)) {
    return { success: false as const, error: "Доступ только для администратора" };
  }

  return { success: true as const, supabase };
}

/**
 * Marks a billing request as paid and activates the subscription tier
 * via subscription_history (DB trigger updates tier_expires_at).
 */
export async function approveBillingRequest(
  requestId: string,
): Promise<ActionOk | ActionError> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return auth;
  }

  const parsedId = requestIdSchema.safeParse(requestId);
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Некорректный ID счёта",
    };
  }

  const { data: request, error: fetchError } = await auth.supabase
    .from("billing_requests")
    .select("id, organization_id, tier_id, period_months, status")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (fetchError) {
    console.error("[approveBillingRequest] fetch", fetchError.message);
    return { success: false, error: fetchError.message };
  }

  if (!request) {
    return { success: false, error: "Счёт не найден" };
  }

  if (request.status === "paid") {
    return { success: false, error: "Счёт уже оплачен" };
  }

  if (request.status === "cancelled") {
    return { success: false, error: "Нельзя подтвердить отменённый счёт" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Счёт нельзя подтвердить в текущем статусе" };
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("billing_requests")
    .update({ status: "paid" })
    .eq("id", request.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[approveBillingRequest] update", updateError.message);
    return { success: false, error: updateError.message };
  }

  if (!updated) {
    return { success: false, error: "Счёт уже обработан другим администратором" };
  }

  const daysAdded = request.period_months * 30;

  const { error: historyError } = await auth.supabase
    .from("subscription_history")
    .insert({
      organization_id: request.organization_id,
      tier_id: request.tier_id,
      days_added: daysAdded,
      action_type: "purchase",
    });

  if (historyError) {
    console.error("[approveBillingRequest] subscription_history", historyError.message);

    await auth.supabase
      .from("billing_requests")
      .update({ status: "pending" })
      .eq("id", request.id)
      .eq("status", "paid");

    return {
      success: false,
      error: `Не удалось активировать подписку: ${historyError.message}`,
    };
  }

  revalidatePath("/dashboard/admin/invoices");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard", "layout");

  return { success: true };
}

/** Cancels a pending billing request. */
export async function cancelBillingRequest(
  requestId: string,
): Promise<ActionOk | ActionError> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return auth;
  }

  const parsedId = requestIdSchema.safeParse(requestId);
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Некорректный ID счёта",
    };
  }

  const { data: request, error: fetchError } = await auth.supabase
    .from("billing_requests")
    .select("id, status")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (fetchError) {
    console.error("[cancelBillingRequest] fetch", fetchError.message);
    return { success: false, error: fetchError.message };
  }

  if (!request) {
    return { success: false, error: "Счёт не найден" };
  }

  if (request.status === "paid") {
    return { success: false, error: "Нельзя отменить уже оплаченный счёт" };
  }

  if (request.status === "cancelled") {
    return { success: false, error: "Счёт уже отменён" };
  }

  const { error: updateError } = await auth.supabase
    .from("billing_requests")
    .update({ status: "cancelled" })
    .eq("id", request.id)
    .eq("status", "pending");

  if (updateError) {
    console.error("[cancelBillingRequest] update", updateError.message);
    return { success: false, error: updateError.message };
  }

  revalidatePath("/dashboard/admin/invoices");
  revalidatePath("/dashboard/invoices");

  return { success: true };
}
