"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

type ActionError = { success: false; error: string };
type ActionOk = { success: true };

const manualAdjustmentSchema = z.object({
  organizationId: z.string().uuid("Некорректный ID организации"),
  tierId: z.string().trim().min(1, "Укажите тариф"),
  daysAdded: z.coerce
    .number()
    .int("Количество дней должно быть целым")
    .min(0, "Количество дней не может быть отрицательным"),
});

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
 * Admin manual subscription adjustment.
 * Inserts into subscription_history; DB trigger updates tier_expires_at.
 */
export async function addManualSubscriptionAdjustment(
  formData: FormData,
): Promise<ActionOk | ActionError> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return auth;
  }

  const parsed = manualAdjustmentSchema.safeParse({
    organizationId: formData.get("organizationId"),
    tierId: formData.get("tierId"),
    daysAdded: formData.get("daysAdded"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const { organizationId, tierId, daysAdded } = parsed.data;

  const { error } = await auth.supabase.from("subscription_history").insert({
    organization_id: organizationId,
    tier_id: tierId,
    days_added: daysAdded,
    action_type: "manual_adjustment",
  });

  if (error) {
    console.error("[addManualSubscriptionAdjustment]", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
