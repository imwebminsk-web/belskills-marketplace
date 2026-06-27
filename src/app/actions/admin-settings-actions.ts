"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type PlatformSettingsRow =
  Database["public"]["Tables"]["platform_settings"]["Row"];

type ActionError = { success: false; error: string };
type ActionOk<T> = { success: true; data: T };

const PLATFORM_SETTINGS_ID = 1;

const MAX_SIGNATURE_BASE64_LENGTH = 500_000;

const platformSettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Укажите название компании"),
  unp: z.string().trim().min(1, "Укажите УНП"),
  legalAddress: z.string().trim().min(1, "Укажите юридический адрес"),
  mailingAddress: z.string().trim().optional(),
  iban: z.string().trim().min(1, "Укажите расчётный счёт (IBAN)"),
  bic: z.string().trim().min(1, "Укажите код банка (BIC)"),
  directorPosition: z.string().trim().min(1, "Укажите должность руководителя"),
  directorName: z.string().trim().min(1, "Укажите ФИО руководителя"),
  basisOfAuthority: z.string().trim().min(1, "Укажите основание полномочий"),
  signatureImageBase64: z
    .string()
    .max(
      MAX_SIGNATURE_BASE64_LENGTH,
      "Изображение подписи слишком большое (макс. ~500 КБ)",
    )
    .optional(),
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

export async function getPlatformSettings(): Promise<
  ActionOk<PlatformSettingsRow> | ActionError
> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from("platform_settings")
    .select("*")
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("[getPlatformSettings]", error.message);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "Настройки платформы не найдены" };
  }

  return { success: true, data };
}

export async function updatePlatformSettings(
  formData: FormData,
): Promise<ActionOk<PlatformSettingsRow> | ActionError> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const signatureRaw = formData.get("signatureImageBase64");
  const signatureImageBase64 =
    typeof signatureRaw === "string" && signatureRaw.trim().length > 0
      ? signatureRaw.trim()
      : undefined;

  const parsed = platformSettingsSchema.safeParse({
    companyName: formData.get("companyName"),
    unp: formData.get("unp"),
    legalAddress: formData.get("legalAddress"),
    mailingAddress: formData.get("mailingAddress") ?? "",
    iban: formData.get("iban"),
    bic: formData.get("bic"),
    directorPosition: formData.get("directorPosition"),
    directorName: formData.get("directorName"),
    basisOfAuthority: formData.get("basisOfAuthority"),
    signatureImageBase64,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const data = parsed.data;

  const mailingAddress = data.mailingAddress?.trim() ?? "";

  const updatePayload: Database["public"]["Tables"]["platform_settings"]["Update"] =
    {
      company_name: data.companyName,
      unp: data.unp,
      legal_address: data.legalAddress,
      mailing_address: mailingAddress.length > 0 ? mailingAddress : null,
      iban: data.iban,
      bic: data.bic,
      director_name: data.directorName,
      director_position: data.directorPosition,
      basis_of_authority: data.basisOfAuthority,
      updated_at: new Date().toISOString(),
    };

  if (data.signatureImageBase64) {
    updatePayload.signature_image_base64 = data.signatureImageBase64;
  }

  const { data: row, error } = await auth.supabase
    .from("platform_settings")
    .update(updatePayload)
    .eq("id", PLATFORM_SETTINGS_ID)
    .select("*")
    .single();

  if (error) {
    console.error("[updatePlatformSettings]", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/settings/billing");
  return { success: true, data: row };
}
