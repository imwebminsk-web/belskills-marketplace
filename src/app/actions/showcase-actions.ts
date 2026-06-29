"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadAuthContext } from "@/lib/auth/access";
import {
  getPrimaryActiveStaffTenant,
  hasCreatorOrgAccess,
} from "@/lib/auth/tenant";
import {
  extractLogoStoragePath,
} from "@/lib/organization/showcase-profile";
import {
  addBranchSchema,
  branchIdSchema,
  organizationLogoPathSchema,
  organizationSlugSchema,
  updateOrganizationProfileSchema,
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

export type AddBranchState = {
  error?: string;
  success?: boolean;
};

const emptyState: UpdateOrganizationProfileState = {};
const emptyBranchState: AddBranchState = {};
const LOGOS_BUCKET = "logos";

async function requireShowcaseStaff() {
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

  if (!hasCreatorOrgAccess(tenants)) {
    return {
      success: false as const,
      error: "Доступ только для владельцев и кураторов школы.",
    };
  }

  const primaryTenant = getPrimaryActiveStaffTenant(tenants);

  if (!primaryTenant) {
    return { success: false as const, error: "Организация не найдена." };
  }

  return { success: true as const, supabase, primaryTenant };
}

export async function getOrganizationProfile(
  organizationId: string,
): Promise<OrganizationProfileRow | null> {
  const auth = await requireShowcaseStaff();
  if (!auth.success) {
    return null;
  }

  if (auth.primaryTenant.organizationId !== organizationId) {
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

export async function updateOrganizationProfile(
  _prev: UpdateOrganizationProfileState,
  formData: FormData,
): Promise<UpdateOrganizationProfileState> {
  const auth = await requireShowcaseStaff();
  if (!auth.success) {
    return { ...emptyState, error: auth.error };
  }

  const { supabase, primaryTenant } = auth;

  const parsed = updateOrganizationProfileSchema.safeParse({
    public_name: formData.get("public_name"),
    short_description: formData.get("short_description"),
    long_description: formData.get("long_description"),
    cover_url: formData.get("cover_url"),
    gallery: formData.get("gallery"),
    unp: formData.get("unp"),
    legal_name: formData.get("legal_name"),
    phones: formData.getAll("phones"),
    social_links: {
      instagram: formData.get("social_instagram"),
      telegram: formData.get("social_telegram"),
      viber: formData.get("social_viber"),
      facebook: formData.get("social_facebook"),
      vk: formData.get("social_vk"),
    },
    website: formData.get("website"),
    phone_main: formData.get("phone_main"),
    messenger_viber: formData.get("messenger_viber"),
    messenger_telegram: formData.get("messenger_telegram"),
    messenger_whatsapp: formData.get("messenger_whatsapp"),
  });

  if (!parsed.success) {
    return {
      ...emptyState,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const data = parsed.data;

  const messengers = {
    viber: data.messenger_viber ?? "",
    telegram: data.messenger_telegram ?? "",
    whatsapp: data.messenger_whatsapp ?? "",
  };

  const { error } = await supabase
    .from("organization_profiles")
    .update({
      public_name: data.public_name,
      short_description: data.short_description,
      long_description: data.long_description,
      cover_url: data.cover_url,
      gallery: data.gallery,
      unp: data.unp,
      legal_name: data.legal_name,
      phones: data.phones,
      social_links: data.social_links,
      website: data.website,
      phone_main: data.phone_main,
      messengers,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", primaryTenant.organizationId);

  if (error) {
    console.error("[updateOrganizationProfile]", error.message);
    return { ...emptyState, error: "Не удалось сохранить профиль. Попробуйте позже." };
  }

  await syncLegalFieldsToBillingRequests(supabase, primaryTenant.organizationId, {
    unp: data.unp,
    legalName: data.legal_name,
  });

  revalidatePath("/dashboard/learning-center");
  revalidatePath("/dashboard/checkout");
  revalidatePath("/dashboard/invoices");

  return { success: true };
}

export async function addBranch(
  _prev: AddBranchState,
  formData: FormData,
): Promise<AddBranchState> {
  const auth = await requireShowcaseStaff();
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

  revalidatePath("/dashboard/learning-center");

  return { success: true };
}

export async function deleteBranch(
  branchId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireShowcaseStaff();
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

  revalidatePath("/dashboard/learning-center");

  return { success: true };
}

export async function saveOrganizationLogo(
  storagePath: string,
): Promise<
  { success: true; logoUrl: string } | { success: false; error: string }
> {
  const auth = await requireShowcaseStaff();
  if (!auth.success) {
    return auth;
  }

  const parsedPath = organizationLogoPathSchema.safeParse(storagePath);
  if (!parsedPath.success) {
    return {
      success: false,
      error:
        parsedPath.error.issues[0]?.message ?? "Некорректный путь к файлу",
    };
  }

  const { supabase, primaryTenant } = auth;
  const organizationIdFromPath = storagePath.split("/")[0];

  if (organizationIdFromPath !== primaryTenant.organizationId) {
    return { success: false, error: "Нет доступа к этой организации." };
  }

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

  revalidatePath("/dashboard/learning-center");

  return { success: true, logoUrl };
}

export type OrganizationSlugAvailability = {
  available: boolean;
  reason?: string;
};

export async function checkOrganizationSlugAvailability(
  slug: string,
): Promise<
  { success: true; data: OrganizationSlugAvailability } | { success: false; error: string }
> {
  const auth = await requireShowcaseStaff();
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
): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  const auth = await requireShowcaseStaff();
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

  console.log(
    "DEBUG [showcase-actions]: Fetching profile for Org ID:",
    primaryTenant?.organizationId,
  );

  const { data: ownProfile, error: fetchError } = await supabase
    .from("organization_profiles")
    .select("id, slug, organization_id")
    .eq("organization_id", primaryTenant.organizationId)
    .maybeSingle();

  console.log("DEBUG [showcase-actions]: Fetch Result:", {
    ownProfile,
    fetchError,
  });

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

  revalidatePath("/dashboard/learning-center");
  revalidatePath(`/school/${parsed.data}`);
  if (previousSlug !== parsed.data) {
    revalidatePath(`/school/${previousSlug}`);
  }

  return { success: true, slug: parsed.data };
}

export async function deleteOrganizationLogo(): Promise<
  { success: true } | { success: false; error: string }
> {
  const auth = await requireShowcaseStaff();
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

  revalidatePath("/dashboard/learning-center");
  if (profile.slug) {
    revalidatePath(`/school/${profile.slug}`);
  }

  return { success: true };
}
