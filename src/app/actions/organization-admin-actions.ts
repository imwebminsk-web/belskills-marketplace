"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import type { OrganizationShowcaseStatus } from "@/lib/organization/profile-status";
import { createClient } from "@/lib/supabase/server";

type ActionError = { success: false; error: string };
type ActionOk = { success: true };

const orgIdSchema = z.string().uuid("Некорректный ID организации");

const adminStatusSchema = z.enum([
  "published",
  "rejected",
  "hidden",
] satisfies readonly OrganizationShowcaseStatus[]);

async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "Требуется вход в систему" };
  }

  const profile = await loadGateProfile(user.id);

  if (!profile || !isGlobalAdmin(profile)) {
    return { success: false as const, error: "Доступ только для администратора" };
  }

  return { success: true as const, supabase };
}

function revalidateOrganizationPaths(slug?: string | null) {
  revalidatePath("/dashboard/admin/organizations");
  revalidatePath("/");
  revalidatePath("/courses/[slug]", "page");
  if (slug?.trim()) {
    revalidatePath(`/school/${slug.trim()}`);
  }
}

export async function adminUpdateOrgStatus(
  organizationId: string,
  status: z.infer<typeof adminStatusSchema>,
  rejectionReason?: string | null,
): Promise<ActionOk | ActionError> {
  const auth = await requireAdminClient();
  if (!auth.success) {
    return auth;
  }

  const parsedId = orgIdSchema.safeParse(organizationId);
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Некорректный ID организации",
    };
  }

  const parsedStatus = adminStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return {
      success: false,
      error: "Недопустимый статус для администратора",
    };
  }

  const trimmedReason = rejectionReason?.trim() ?? "";

  if (parsedStatus.data === "rejected" && trimmedReason.length < 3) {
    return {
      success: false,
      error: "Укажите причину отклонения (не короче 3 символов).",
    };
  }

  const { data: profile, error: fetchError } = await auth.supabase
    .from("organization_profiles")
    .select("id, status, slug")
    .eq("organization_id", parsedId.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("[adminUpdateOrgStatus] fetch", fetchError.message);
    return { success: false, error: fetchError.message };
  }

  if (!profile) {
    return { success: false, error: "Профиль организации не найден." };
  }

  const currentStatus = profile.status as OrganizationShowcaseStatus;

  if (parsedStatus.data === "published" && currentStatus !== "moderation") {
    return {
      success: false,
      error: "Одобрить можно только организацию на модерации.",
    };
  }

  if (parsedStatus.data === "rejected" && currentStatus !== "moderation") {
    return {
      success: false,
      error: "Отклонить можно только организацию на модерации.",
    };
  }

  if (parsedStatus.data === "hidden" && currentStatus !== "published") {
    return {
      success: false,
      error: "Снять с публикации можно только опубликованную организацию.",
    };
  }

  const updatePayload: {
    status: OrganizationShowcaseStatus;
    rejection_reason: string | null;
    updated_at: string;
  } = {
    status: parsedStatus.data,
    rejection_reason:
      parsedStatus.data === "rejected" ? trimmedReason : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await auth.supabase
    .from("organization_profiles")
    .update(updatePayload)
    .eq("organization_id", parsedId.data);

  if (updateError) {
    console.error("[adminUpdateOrgStatus] update", updateError.message);
    return { success: false, error: "Не удалось обновить статус организации." };
  }

  revalidateOrganizationPaths(profile.slug);
  return { success: true };
}

export async function adminApproveOrganization(
  organizationId: string,
): Promise<ActionOk | ActionError> {
  return adminUpdateOrgStatus(organizationId, "published");
}

export async function adminRejectOrganization(
  organizationId: string,
  rejectionReason: string,
): Promise<ActionOk | ActionError> {
  return adminUpdateOrgStatus(organizationId, "rejected", rejectionReason);
}

export async function adminUnpublishOrganization(
  organizationId: string,
): Promise<ActionOk | ActionError> {
  return adminUpdateOrgStatus(organizationId, "hidden");
}
