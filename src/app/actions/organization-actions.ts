"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadAuthContext } from "@/lib/auth/access";
import { hasCreatorOrgAccess } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { createTrialOrganizationSchema } from "@/lib/validations/organization-schema";

export type CreateTrialOrganizationState = {
  error?: string;
};

const initial: CreateTrialOrganizationState = {};

const TRIAL_DURATION_DAYS = 30;

export async function createTrialOrganization(
  _prev: CreateTrialOrganizationState,
  formData: FormData,
): Promise<CreateTrialOrganizationState> {
  const parsed = createTrialOrganizationSchema.safeParse({
    schoolName: formData.get("schoolName"),
    org_type: formData.get("org_type"),
  });

  if (!parsed.success) {
    return {
      ...initial,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы.",
    };
  }

  const { schoolName, org_type: orgType } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { ...initial, error: "Профиль не найден." };
  }

  if (hasCreatorOrgAccess(tenants)) {
    return { ...initial, error: "У вас уже есть школа." };
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: schoolName,
      org_type: orgType,
      tier_id: "free",
    })
    .select("id")
    .single();

  if (orgError || !organization) {
    console.error("[createTrialOrganization] organization", orgError?.message);
    return { ...initial, error: "Не удалось создать школу. Попробуйте позже." };
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    console.error("[createTrialOrganization] member", memberError.message);
    return {
      ...initial,
      error: "Школа создана, но не удалось назначить владельца. Обратитесь в поддержку.",
    };
  }

  const { error: historyError } = await supabase
    .from("subscription_history")
    .insert({
      organization_id: organization.id,
      tier_id: "trial",
      days_added: TRIAL_DURATION_DAYS,
      action_type: "purchase",
    });

  if (historyError) {
    console.error("[createTrialOrganization] subscription_history", historyError.message);
    return {
      ...initial,
      error: "Школа создана, но не удалось активировать trial. Обратитесь в поддержку.",
    };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/courses");
}
