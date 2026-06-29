import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";

import { ProfileForm } from "@/components/dashboard/learning-center/profile-form";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
  hasCreatorOrgAccess,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Учебный центр",
  description: "Публичный профиль вашей школы в каталоге",
};

export default async function LearningCenterPage() {
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
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTenantsSafe(user.id),
  ]);

  if (profileError || !profile) {
    redirect("/login");
  }

  if (!hasCreatorOrgAccess(tenants)) {
    redirect("/dashboard/settings");
  }

  const primaryTenant = getPrimaryActiveStaffTenant(tenants);

  if (!primaryTenant) {
    redirect("/dashboard/settings");
  }

  const [{ data: organizationProfile, error: showcaseError }, { data: branches, error: branchesError }] =
    await Promise.all([
      supabase
        .from("organization_profiles")
        .select("*")
        .eq("organization_id", primaryTenant.organizationId)
        .maybeSingle(),
      supabase
        .from("organization_branches")
        .select("*")
        .eq("organization_id", primaryTenant.organizationId)
        .order("created_at", { ascending: true }),
    ]);

  if (showcaseError) {
    console.error("[LearningCenterPage] profile", showcaseError.message);
    throw new Error("Не удалось загрузить профиль учебного центра");
  }

  if (branchesError) {
    console.error("[LearningCenterPage] branches", branchesError.message);
    throw new Error("Не удалось загрузить филиалы");
  }

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Пользователь";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Учебный центр</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Настройте публичную витрину школы «{primaryTenant.organizationName}
                » для каталога BelSkills.
              </p>
            </div>
            {organizationProfile ? (
              <Button asChild variant="outline" className="shrink-0">
                <Link
                  href={`/school/${encodeURIComponent(organizationProfile.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="size-4" aria-hidden />
                  <span className="ml-2">Предпросмотр витрины</span>
                </Link>
              </Button>
            ) : null}
          </div>

          {organizationProfile ? (
            <ProfileForm
              profile={organizationProfile}
              branches={branches ?? []}
              organizationId={primaryTenant.organizationId}
              organizationName={primaryTenant.organizationName}
            />
          ) : (
            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              <p className="text-foreground font-medium">
                Публичный профиль не найден
              </p>
              <p className="mt-2">
                Для вашей организации ещё не создана запись витрины. Обычно она
                появляется автоматически при создании школы.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard/settings">Перейти в настройки</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
