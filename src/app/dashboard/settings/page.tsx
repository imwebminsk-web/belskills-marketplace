import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsPageContent } from "@/components/dashboard/settings/settings-page-content";
import { SiteHeader } from "@/components/site-header";
import { fetchOrganizationBrandName } from "@/lib/organization/brand-name";
import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
  hasCreatorOrgAccess,
  resolveDashboardShellRole,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Настройки профиля",
  description: "Имя, email и роль вашего аккаунта",
};

type SettingsPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile, error: profileError }, tenants] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, is_global_admin")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTenantsSafe(user.id),
  ]);

  if (profileError || !profile) {
    redirect("/login");
  }

  const shellRole = resolveDashboardShellRole(profile.is_global_admin, tenants);
  const primaryStaffTenant = hasCreatorOrgAccess(tenants)
    ? (getPrimaryActiveStaffTenant(tenants) ?? tenants[0] ?? null)
    : null;
  const staffSchoolBrandName =
    primaryStaffTenant != null
      ? await fetchOrganizationBrandName(
          supabase,
          primaryStaffTenant.organizationId,
          primaryStaffTenant.organizationName,
        )
      : null;

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Пользователь";

  const params = await searchParams;
  const feedbackKey =
    params.saved === "1"
      ? ("saved" as const)
      : params.error === "empty_name"
        ? ("empty_name" as const)
        : params.error === "update_failed"
          ? ("update_failed" as const)
          : null;

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <SettingsPageContent
            userId={user.id}
            email={user.email ?? "—"}
            role={shellRole}
            defaultFullName={profile.full_name ?? ""}
            avatarUrl={profile.avatar_url}
            displayName={displayName}
            feedbackKey={feedbackKey}
            staffSchoolBrandName={staffSchoolBrandName}
          />
        </div>
      </div>
    </>
  );
}
