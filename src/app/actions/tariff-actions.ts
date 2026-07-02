"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import { LEGACY_TARIFF_IDS } from "@/lib/tariffs/format-tier-limits";
import { rublesToKopecks } from "@/lib/utils/pricing";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

export type TariffRow = Database["public"]["Tables"]["subscription_tiers"]["Row"];

type ActionError = { success: false; error: string };
type ActionOk<T> = { success: true; data: T };

const tariffIdSchema = z
  .string()
  .trim()
  .min(1, "Укажите ID тарифа")
  .max(64, "ID слишком длинный")
  .regex(
    /^[a-z0-9-_]+$/,
    "ID: латиница, цифры, дефис и подчеркивание (например, corp_enterprise)",
  );

const upsertTariffSchema = z.object({
  id: tariffIdSchema,
  name: z.string().trim().min(1, "Укажите название"),
  description: z.string().trim().optional(),
  price_monthly: z.coerce.number().int().min(0, "Цена не может быть отрицательной"),
  discount_3_months: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, "Скидка не больше 100%"),
  discount_6_months: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, "Скидка не больше 100%"),
  discount_12_months: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, "Скидка не больше 100%"),
  priority_level: z.coerce.number().int().min(0).max(9999),
  is_active: z.boolean(),
  features: z.array(z.string().trim().min(1)).default([]),
  presents: z.array(z.string().trim().min(1)).default([]),
  limits_text: z.array(z.string().trim().min(1)).default([]),
  limits: z.record(z.string(), z.unknown()).default({}),
});

async function requireAdmin(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>> }
  | ActionError
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Требуется вход в систему" };
  }

  const profile = await loadGateProfile(user.id);

  if (!profile) {
    return { success: false, error: "Профиль не найден" };
  }

  if (!isGlobalAdmin(profile)) {
    return { success: false, error: "Доступ только для администратора" };
  }

  return { supabase };
}

function parseLinesToStringArray(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseLimitsInput(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "{}") {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Поле limits должно быть валидным JSON-объектом");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("Поле limits должно быть JSON-объектом, например {\"courses\": 10}");
  }

  return parsed as Record<string, unknown>;
}

function readFormBoolean(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

function revalidateTariffPaths() {
  revalidatePath("/dashboard/admin/tariffs");
  revalidatePath("/dashboard/tariffs");
}

export async function getTariffs(): Promise<ActionOk<TariffRow[]> | ActionError> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from("subscription_tiers")
    .select("*")
    .order("price_monthly", { ascending: true });

  if (error) {
    console.error("[getTariffs]", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}

export async function upsertTariff(
  formData: FormData,
): Promise<ActionOk<TariffRow> | ActionError> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const featuresRaw = String(formData.get("features") ?? "");
  const presentsRaw = String(formData.get("presents") ?? "");
  const limitsTextRaw = String(formData.get("limits_text") ?? "");
  const limitsRaw = String(formData.get("limits") ?? "{}");

  let limits: Record<string, unknown>;
  try {
    limits = parseLimitsInput(limitsRaw);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Некорректный JSON в limits",
    };
  }

  const priceRubles = Number(formData.get("price_monthly"));
  if (!Number.isFinite(priceRubles) || priceRubles < 0) {
    return { success: false, error: "Укажите корректную цену в BYN (число ≥ 0)" };
  }

  const parsed = upsertTariffSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price_monthly: rublesToKopecks(priceRubles),
    discount_3_months: formData.get("discount_3_months"),
    discount_6_months: formData.get("discount_6_months"),
    discount_12_months: formData.get("discount_12_months"),
    priority_level: formData.get("priority_level"),
    is_active: readFormBoolean(formData, "is_active"),
    features: parseLinesToStringArray(featuresRaw),
    presents: parseLinesToStringArray(presentsRaw),
    limits_text: parseLinesToStringArray(limitsTextRaw),
    limits,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const payload = parsed.data;
  const description =
    payload.description && payload.description.length > 0
      ? payload.description
      : null;

  const row: Database["public"]["Tables"]["subscription_tiers"]["Insert"] = {
    id: payload.id,
    name: payload.name,
    description,
    price_monthly: payload.price_monthly,
    discount_3_months: payload.discount_3_months,
    discount_6_months: payload.discount_6_months,
    discount_12_months: payload.discount_12_months,
    priority_level: payload.priority_level,
    is_active: payload.is_active,
    features: payload.features as Json,
    presents: payload.presents as Json,
    limits_text: payload.limits_text as Json,
    limits: payload.limits as Json,
  };

  const { data, error } = await auth.supabase
    .from("subscription_tiers")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    console.error("[upsertTariff]", error.message);
    return { success: false, error: error.message };
  }

  revalidateTariffPaths();
  return { success: true, data };
}

export async function deleteLegacyTariffs(): Promise<
  ActionOk<{ deletedIds: string[] }> | ActionError
> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const { error } = await auth.supabase
    .from("subscription_tiers")
    .delete()
    .in("id", [...LEGACY_TARIFF_IDS]);

  if (error) {
    console.error("[deleteLegacyTariffs]", error.message);
    return {
      success: false,
      error:
        "Не удалось удалить старые тарифы. Возможно, на них ещё ссылаются организации.",
    };
  }

  revalidateTariffPaths();
  return { success: true, data: { deletedIds: [...LEGACY_TARIFF_IDS] } };
}
