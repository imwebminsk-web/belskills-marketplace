"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadAuthContext, canAccessOrganization, isGlobalAdmin } from "@/lib/auth/access";
import {
  getPrimaryActiveStaffTenant,
  hasCreatorOrgAccess,
} from "@/lib/auth/tenant";
import {
  extractLogoStoragePath,
} from "@/lib/organization/showcase-profile";
import {
  canSubmitProfileForModeration,
  parseShowcaseStatus,
  type OrganizationShowcaseStatus,
} from "@/lib/organization/profile-status";
import {
  addBranchSchema,
  branchIdSchema,
  organizationLogoPathSchema,
  organizationSlugSchema,
  updateContactsProfileSchema,
  updateMainProfileSchema,
} from "@/lib/organization/showcase-profile-schemas";
import {
  getOrganizationProfileWithBillingLegal,
  syncLegalFieldsToBillingRequests,
} from "@/lib/billing/organization-legal-sync";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type OrganizationProfileRow =
  Database["public"]["Tables"]["organization_profiles"]["Row"];

export type OrganizationBranchRow =
  Database["public"]["Tables"]["organization_branches"]["Row"];

export type UpdateOrganizationProfileState = {
  error?: string;
  success?: boolean;
};

export type ProfileModerationState = {
  error?: string;
  success?: boolean;
};

export type SoftDeleteProfileState = {
  error?: string;
  success?: boolean;
};

export type AddBranchState = {
  error?: string;
  success?: boolean;
};

const emptyState: UpdateOrganizationProfileState = {};
const emptyBranchState: AddBranchState = {};
const LOGOS_BUCKET = "logos";

function readFormText(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (value == null || typeof value !== "string") {
    return null;
  }
  return value;
}

function buildMessengersJson(data: {
  messenger_viber: string | null;
  messenger_telegram: string | null;
  messenger_whatsapp: string | null;
}): Record<string, string> {
  const messengers: Record<string, string> = {};
  if (data.messenger_viber) {
    messengers.viber = data.messenger_viber;
  }
  if (data.messenger_telegram) {
    messengers.telegram = data.messenger_telegram;
  }
  if (data.messenger_whatsapp) {
    messengers.whatsapp = data.messenger_whatsapp;
  }
  return messengers;
}

/** Бренд → юр. название из формы → системное имя организации. */
async function resolvePublicName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  publicName: string | null,
  legalName: string | null,
  organizationSystemName: string,
): Promise<string> {
  const brand = publicName?.trim();
  if (brand) {
    return brand;
  }

  const legal = legalName?.trim();
  if (legal) {
    return legal;
  }

  const system = organizationSystemName.trim();
  if (system) {
    return system;
  }

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[resolvePublicName]", error.message);
  }

  return organization?.name?.trim() || "Учебный центр";
}

async function resolveOrganizationSystemName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  fallbackName?: string,
): Promise<string> {
  const trimmedFallback = fallbackName?.trim();
  if (trimmedFallback) {
    return trimmedFallback;
  }

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[resolveOrganizationSystemName]", error.message);
  }

  return organization?.name?.trim() || "Учебный центр";
}

async function requireShowcaseStaff(organizationId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { success: false as const, error: "Профиль не найден." };
  }

  const globalAdmin = isGlobalAdmin(profile);
  const requestedOrganizationId = organizationId?.trim() || null;

  if (requestedOrganizationId) {
    if (
      !globalAdmin &&
      !canAccessOrganization(profile, tenants, requestedOrganizationId)
    ) {
      return {
        success: false as const,
        error: "Нет доступа к этой организации.",
      };
    }

    const organizationName = await resolveOrganizationSystemName(
      supabase,
      requestedOrganizationId,
      tenants.find((tenant) => tenant.organizationId === requestedOrganizationId)
        ?.organizationName,
    );

    return {
      success: true as const,
      supabase,
      isGlobalAdmin: globalAdmin,
      primaryTenant: {
        organizationId: requestedOrganizationId,
        organizationName,
      },
    };
  }

  if (!globalAdmin && !hasCreatorOrgAccess(tenants)) {
    return {
      success: false as const,
      error: "Доступ только для владельцев и кураторов школы.",
    };
  }

  const primaryTenant = getPrimaryActiveStaffTenant(tenants);

  if (!primaryTenant) {
    return { success: false as const, error: "Организация не найдена." };
  }

  return {
    success: true as const,
    supabase,
    isGlobalAdmin: globalAdmin,
    primaryTenant,
  };
}

function revalidateShowcaseEditorPaths(
  organizationId: string,
  slug?: string | null,
) {
  revalidatePath("/dashboard/learning-center");
  revalidatePath(`/dashboard/admin/organizations/${organizationId}`);
  revalidatePath("/dashboard/admin/organizations");
  if (slug) {
    revalidatePath(`/school/${slug}`);
  }
}

async function fetchStaffOrganizationProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
) {
  const { data: profile, error } = await supabase
    .from("organization_profiles")
    .select("id, status, deleted_at, unp, legal_name, slug")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[fetchStaffOrganizationProfile]", error.message);
    return { profile: null, error: "Не удалось загрузить профиль." as const };
  }

  if (!profile) {
    return { profile: null, error: "Профиль не найден." as const };
  }

  if (profile.deleted_at) {
    return { profile: null, error: "Профиль удалён." as const };
  }

  return { profile, error: null };
}

function resolveStatusAfterStaffEdit(
  currentStatus: OrganizationShowcaseStatus,
  resubmitToModeration: boolean,
  skipModerationReset = false,
): OrganizationShowcaseStatus | undefined {
  if (skipModerationReset) {
    return undefined;
  }

  if (currentStatus === "blocked") {
    return undefined;
  }

  if (currentStatus === "published" && resubmitToModeration) {
    return "moderation";
  }

  return undefined;
}

export async function getOrganizationProfile(
  organizationId: string,
): Promise<OrganizationProfileRow | null> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return null;
  }

  const { data: profile, error } = await auth.supabase
    .from("organization_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[getOrganizationProfile]", error.message);
    return null;
  }

  return getOrganizationProfileWithBillingLegal(
    auth.supabase,
    profile,
    organizationId,
  );
}

export async function updateMainProfile(
  _prev: UpdateOrganizationProfileState,
  formData: FormData,
): Promise<UpdateOrganizationProfileState> {
  const organizationId = readFormText(formData, "organization_id");
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return { ...emptyState, error: auth.error };
  }

  const { supabase, primaryTenant, isGlobalAdmin } = auth;

  const profileResult = await fetchStaffOrganizationProfile(
    supabase,
    primaryTenant.organizationId,
  );
  if (profileResult.error || !profileResult.profile) {
    return { ...emptyState, error: profileResult.error ?? "Профиль не найден." };
  }

  const currentStatus = parseShowcaseStatus(profileResult.profile.status);
  if (currentStatus === "blocked") {
    return {
      ...emptyState,
      error: "Профиль заблокирован. Обратитесь в поддержку.",
    };
  }

  const parsed = updateMainProfileSchema.safeParse({
    public_name: readFormText(formData, "public_name"),
    short_description: readFormText(formData, "short_description"),
    long_description: readFormText(formData, "long_description"),
    cover_url: readFormText(formData, "cover_url"),
    gallery: readFormText(formData, "gallery"),
    unp: readFormText(formData, "unp") ?? "",
    legal_name: readFormText(formData, "legal_name") ?? "",
    resubmit_to_moderation: readFormText(formData, "resubmit_to_moderation") ?? "",
  });

  if (!parsed.success) {
    console.error(
      "Zod Validation Failed! Issues:",
      JSON.stringify(parsed.error.issues, null, 2),
    );
    return {
      ...emptyState,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const data = parsed.data;

  const publicName = await resolvePublicName(
    supabase,
    primaryTenant.organizationId,
    data.public_name,
    data.legal_name,
    primaryTenant.organizationName,
  );

  const nextStatus = resolveStatusAfterStaffEdit(
    currentStatus,
    data.resubmit_to_moderation,
    isGlobalAdmin,
  );

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      public_name: publicName,
      short_description: data.short_description,
      long_description: data.long_description,
      cover_url: data.cover_url,
      gallery: data.gallery,
      unp: data.unp,
      legal_name: data.legal_name,
      ...(nextStatus ? { status: nextStatus } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    console.error("[updateMainProfile]", error.message);
    return { ...emptyState, error: "Не удалось сохранить профиль. Попробуйте позже." };
  }

  await syncLegalFieldsToBillingRequests(supabase, primaryTenant.organizationId, {
    unp: data.unp,
    legalName: data.legal_name,
  });

  revalidateShowcaseEditorPaths(
    primaryTenant.organizationId,
    profileResult.profile.slug,
  );
  revalidatePath("/dashboard/checkout");
  revalidatePath("/dashboard/invoices");

  return { success: true };
}

export async function updateContactsProfile(
  _prev: UpdateOrganizationProfileState,
  formData: FormData,
): Promise<UpdateOrganizationProfileState> {
  const organizationId = readFormText(formData, "organization_id");
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return { ...emptyState, error: auth.error };
  }

  const { supabase, primaryTenant, isGlobalAdmin } = auth;

  const profileResult = await fetchStaffOrganizationProfile(
    supabase,
    primaryTenant.organizationId,
  );
  if (profileResult.error || !profileResult.profile) {
    return { ...emptyState, error: profileResult.error ?? "Профиль не найден." };
  }

  const currentStatus = parseShowcaseStatus(profileResult.profile.status);
  if (currentStatus === "blocked") {
    return {
      ...emptyState,
      error: "Профиль заблокирован. Обратитесь в поддержку.",
    };
  }

  const parsed = updateContactsProfileSchema.safeParse({
    website: readFormText(formData, "website"),
    phone_main: readFormText(formData, "phone_main"),
    phones: formData.getAll("phones"),
    social_links: {
      instagram: readFormText(formData, "social_instagram"),
      facebook: readFormText(formData, "social_facebook"),
      vk: readFormText(formData, "social_vk"),
      ok: readFormText(formData, "social_ok"),
      linkedin: readFormText(formData, "social_linkedin"),
      tiktok: readFormText(formData, "social_tiktok"),
      x: readFormText(formData, "social_x"),
      youtube: readFormText(formData, "social_youtube"),
    },
    messenger_viber: readFormText(formData, "messenger_viber"),
    messenger_telegram: readFormText(formData, "messenger_telegram"),
    messenger_whatsapp: readFormText(formData, "messenger_whatsapp"),
    resubmit_to_moderation: readFormText(formData, "resubmit_to_moderation") ?? "",
  });

  if (!parsed.success) {
    console.error(
      "Zod Validation Failed! Issues:",
      JSON.stringify(parsed.error.issues, null, 2),
    );
    return {
      ...emptyState,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const data = parsed.data;
  const messengers = buildMessengersJson(data);

  const nextStatus = resolveStatusAfterStaffEdit(
    currentStatus,
    data.resubmit_to_moderation,
    isGlobalAdmin,
  );

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      website: data.website,
      phone_main: data.phone_main,
      phones: data.phones,
      social_links: data.social_links,
      messengers,
      ...(nextStatus ? { status: nextStatus } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    console.error("[updateContactsProfile]", error.message);
    return { ...emptyState, error: "Не удалось сохранить контакты. Попробуйте позже." };
  }

  revalidateShowcaseEditorPaths(
    primaryTenant.organizationId,
    profileResult.profile.slug,
  );

  return { success: true };
}

const emptyModerationState: ProfileModerationState = {};

export async function submitProfileForModeration(
  _prev: ProfileModerationState,
  organizationId?: string,
): Promise<ProfileModerationState> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return { ...emptyModerationState, error: auth.error };
  }

  const { supabase, primaryTenant } = auth;

  const profileResult = await fetchStaffOrganizationProfile(
    supabase,
    primaryTenant.organizationId,
  );
  if (profileResult.error || !profileResult.profile) {
    return {
      ...emptyModerationState,
      error: profileResult.error ?? "Профиль не найден.",
    };
  }

  const profile = profileResult.profile;
  const currentStatus = parseShowcaseStatus(profile.status);

  if (currentStatus === "blocked") {
    return {
      ...emptyModerationState,
      error: "Профиль заблокирован. Обратитесь в поддержку.",
    };
  }

  if (currentStatus === "moderation") {
    return {
      ...emptyModerationState,
      error: "Профиль уже на модерации.",
    };
  }

  if (currentStatus === "published" || currentStatus === "hidden") {
    return {
      ...emptyModerationState,
      error: "Профиль уже опубликован. Измените данные, чтобы отправить на повторную проверку.",
    };
  }

  if (currentStatus !== "draft" && currentStatus !== "rejected") {
    return {
      ...emptyModerationState,
      error: "Профиль нельзя отправить на модерацию в текущем статусе.",
    };
  }

  if (!canSubmitProfileForModeration(profile)) {
    return {
      ...emptyModerationState,
      error: "Заполните УНП, юридическое название и адрес витрины перед отправкой.",
    };
  }

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      status: "moderation",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    console.error("[submitProfileForModeration]", error.message);
    return {
      ...emptyModerationState,
      error: "Не удалось отправить профиль на проверку.",
    };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId, profile.slug);

  return { success: true };
}

export async function setProfileVisibility(
  visible: boolean,
  organizationId?: string,
): Promise<ProfileModerationState> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return { ...emptyModerationState, error: auth.error };
  }

  const { supabase, primaryTenant } = auth;

  const profileResult = await fetchStaffOrganizationProfile(
    supabase,
    primaryTenant.organizationId,
  );
  if (profileResult.error || !profileResult.profile) {
    return {
      ...emptyModerationState,
      error: profileResult.error ?? "Профиль не найден.",
    };
  }

  const profile = profileResult.profile;
  const currentStatus = parseShowcaseStatus(profile.status);

  if (currentStatus === "blocked") {
    return {
      ...emptyModerationState,
      error: "Профиль заблокирован. Обратитесь в поддержку.",
    };
  }

  if (currentStatus !== "published" && currentStatus !== "hidden") {
    return {
      ...emptyModerationState,
      error: "Переключатель видимости доступен только для опубликованных профилей.",
    };
  }

  const nextStatus: OrganizationShowcaseStatus = visible ? "published" : "hidden";

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    console.error("[setProfileVisibility]", error.message);
    return {
      ...emptyModerationState,
      error: "Не удалось изменить видимость профиля.",
    };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId, profile.slug);

  return { success: true };
}

export async function softDeleteOrganizationProfile(
  legalNameConfirmation: string,
  organizationId?: string,
): Promise<SoftDeleteProfileState> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return { error: auth.error };
  }

  const { supabase, primaryTenant } = auth;

  const { data: profile, error: fetchError } = await supabase
    .from("organization_profiles")
    .select("legal_name, slug, deleted_at")
    .eq("organization_id", primaryTenant.organizationId)
    .maybeSingle();

  if (fetchError) {
    console.error("[softDeleteOrganizationProfile]", fetchError.message);
    return { error: "Не удалось загрузить профиль." };
  }

  if (!profile) {
    return { error: "Профиль не найден." };
  }

  if (profile.deleted_at) {
    return { error: "Профиль уже удалён." };
  }

  const expectedLegalName = profile.legal_name?.trim() ?? "";
  if (!expectedLegalName) {
    return { error: "Сначала укажите юридическое название в профиле." };
  }

  if (legalNameConfirmation.trim() !== expectedLegalName) {
    return { error: "Юридическое название не совпадает." };
  }

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    console.error("[softDeleteOrganizationProfile]", error.message);
    return { error: "Не удалось удалить профиль." };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId, profile.slug);

  return { success: true };
}

/** @deprecated Use updateMainProfile / updateContactsProfile */
export async function updateOrganizationProfile(
  _prev: UpdateOrganizationProfileState,
  formData: FormData,
): Promise<UpdateOrganizationProfileState> {
  const mainResult = await updateMainProfile(_prev, formData);
  if (mainResult.error) {
    return mainResult;
  }
  return updateContactsProfile(_prev, formData);
}

export async function addBranch(
  _prev: AddBranchState,
  formData: FormData,
): Promise<AddBranchState> {
  const organizationId = readFormText(formData, "organization_id");
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return { ...emptyBranchState, error: auth.error };
  }

  const { supabase, primaryTenant } = auth;

  const parsed = addBranchSchema.safeParse({
    city: formData.get("city"),
    address: formData.get("address"),
    label: formData.get("label") ?? "",
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      ...emptyBranchState,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const { error } = await supabase.from("organization_branches").insert({
    organization_id: primaryTenant.organizationId,
    city: parsed.data.city,
    address: parsed.data.address,
    label: parsed.data.label,
    phone: parsed.data.phone,
  });

  if (error) {
    console.error("[addBranch]", error.message);
    return { ...emptyBranchState, error: "Не удалось добавить филиал." };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId);

  return { success: true };
}

export async function deleteBranch(
  branchId: string,
  organizationId?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return auth;
  }

  const parsedId = branchIdSchema.safeParse(branchId);
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Некорректный ID филиала",
    };
  }

  const { supabase, primaryTenant } = auth;

  const { data: branch, error: fetchError } = await supabase
    .from("organization_branches")
    .select("id, organization_id")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteBranch] fetch", fetchError.message);
    return { success: false, error: "Не удалось удалить филиал." };
  }

  if (!branch) {
    return { success: false, error: "Филиал не найден." };
  }

  if (branch.organization_id !== primaryTenant.organizationId) {
    return { success: false, error: "Нет доступа к этому филиалу." };
  }

  const { error: deleteError } = await supabase
    .from("organization_branches")
    .delete()
    .eq("id", branch.id)
    .eq("organization_id", primaryTenant.organizationId);

  if (deleteError) {
    console.error("[deleteBranch]", deleteError.message);
    return { success: false, error: "Не удалось удалить филиал." };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId);

  return { success: true };
}

export async function saveOrganizationLogo(
  storagePath: string,
): Promise<
  { success: true; logoUrl: string } | { success: false; error: string }
> {
  const parsedPath = organizationLogoPathSchema.safeParse(storagePath);
  if (!parsedPath.success) {
    return {
      success: false,
      error:
        parsedPath.error.issues[0]?.message ?? "Некорректный путь к файлу",
    };
  }

  const organizationIdFromPath = storagePath.split("/")[0];
  const auth = await requireShowcaseStaff(organizationIdFromPath);
  if (!auth.success) {
    return auth;
  }

  const { supabase, primaryTenant } = auth;

  const {
    data: { publicUrl },
  } = supabase.storage.from(LOGOS_BUCKET).getPublicUrl(storagePath);

  const logoUrl = `${publicUrl}?v=${Date.now()}`;

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    console.error("[saveOrganizationLogo]", error.message);
    return { success: false, error: "Не удалось сохранить логотип." };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId);

  return { success: true, logoUrl };
}

export type OrganizationSlugAvailability = {
  available: boolean;
  reason?: string;
};

export async function checkOrganizationSlugAvailability(
  slug: string,
  organizationId?: string,
): Promise<
  { success: true; data: OrganizationSlugAvailability } | { success: false; error: string }
> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return auth;
  }

  const parsed = organizationSlugSchema.safeParse(slug);
  if (!parsed.success) {
    return {
      success: true,
      data: {
        available: false,
        reason:
          parsed.error.issues[0]?.message ?? "Некорректный адрес страницы.",
      },
    };
  }

  const { supabase, primaryTenant } = auth;

  const { data: currentProfile } = await supabase
    .from("organization_profiles")
    .select("slug")
    .eq("organization_id", primaryTenant.organizationId)
    .maybeSingle();

  if (currentProfile?.slug === parsed.data) {
    return { success: true, data: { available: true } };
  }

  const { data: existing, error } = await supabase
    .from("organization_profiles")
    .select("id")
    .eq("slug", parsed.data)
    .maybeSingle();

  if (error) {
    console.error("[checkOrganizationSlugAvailability]", error.message);
    return { success: false, error: "Не удалось проверить адрес." };
  }

  if (existing) {
    return {
      success: true,
      data: { available: false, reason: "Этот адрес уже занят." },
    };
  }

  return { success: true, data: { available: true } };
}

export async function updateOrganizationSlug(
  slug: string,
  organizationId?: string,
): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return auth;
  }

  const parsed = organizationSlugSchema.safeParse(slug);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректный адрес страницы.",
    };
  }

  const { supabase, primaryTenant } = auth;

  const { data: ownProfile, error: fetchError } = await supabase
    .from("organization_profiles")
    .select("id, slug, organization_id")
    .eq("organization_id", primaryTenant.organizationId)
    .maybeSingle();

  if (fetchError) {
    console.error("[updateOrganizationSlug] fetch", fetchError.message);
    return { success: false, error: "Не удалось загрузить профиль." };
  }

  if (!ownProfile) {
    return { success: false, error: "Профиль учебного центра не найден." };
  }

  if (ownProfile.slug === parsed.data) {
    return { success: true, slug: parsed.data };
  }

  const { data: conflict } = await supabase
    .from("organization_profiles")
    .select("id")
    .eq("slug", parsed.data)
    .neq("id", ownProfile.id)
    .maybeSingle();

  if (conflict) {
    return { success: false, error: "Этот адрес уже занят." };
  }

  const previousSlug = ownProfile.slug;

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      slug: parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Этот адрес уже занят." };
    }

    console.error("[updateOrganizationSlug]", error.message);
    return { success: false, error: "Не удалось сохранить адрес страницы." };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId, parsed.data);
  if (previousSlug && previousSlug !== parsed.data) {
    revalidatePath(`/school/${previousSlug}`);
  }

  return { success: true, slug: parsed.data };
}

export async function deleteOrganizationLogo(
  organizationId?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireShowcaseStaff(organizationId);
  if (!auth.success) {
    return auth;
  }

  const { supabase, primaryTenant } = auth;

  const { data: profile, error: fetchError } = await supabase
    .from("organization_profiles")
    .select("logo_url, slug")
    .eq("organization_id", primaryTenant.organizationId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteOrganizationLogo] fetch", fetchError.message);
    return { success: false, error: "Не удалось удалить логотип." };
  }

  if (!profile?.logo_url) {
    return { success: true };
  }

  const storagePath = extractLogoStoragePath(
    profile.logo_url,
    primaryTenant.organizationId,
  );

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(LOGOS_BUCKET)
      .remove([storagePath]);

    if (storageError) {
      console.error("[deleteOrganizationLogo] storage", storageError.message);
      return { success: false, error: "Не удалось удалить файл логотипа." };
    }
  }

  const { error: updateError } = await supabase
    .from("organization_profiles")
    .update({
      logo_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (updateError) {
    console.error("[deleteOrganizationLogo] update", updateError.message);
    return { success: false, error: "Не удалось обновить профиль." };
  }

  revalidateShowcaseEditorPaths(primaryTenant.organizationId, profile.slug);

  return { success: true };
}
