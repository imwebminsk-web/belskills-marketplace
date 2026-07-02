import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";

import { ProfileForm } from "@/components/dashboard/learning-center/profile-form";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrganizationProfileWithBillingLegal } from "@/lib/billing/organization-legal-sync";
import { requireGlobalAdmin } from "@/lib/auth/access";
import {
  parseShowcaseStatus,
  type OrganizationShowcaseStatus,
} from "@/lib/organization/profile-status";
import { resolveOrganizationBrandName } from "@/lib/organization/showcase-profile";
import type { OrganizationTypeValue } from "@/lib/validations/organization-schema";

export const metadata: Metadata = {
  title: "Редактирование учебного центра",
  description: "Редактирование публичной витрины учебного центра администратором",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function statusLabel(status: OrganizationShowcaseStatus): string {
  switch (status) {
    case "published":
      return "Опубликовано";
    case "moderation":
      return "На модерации";
    case "rejected":
      return "Отклонено";
    case "hidden":
      return "Снято с публикации";
    case "blocked":
      return "Заблокировано";
    case "draft":
    default:
      return "Черновик";
  }
}

export default async function AdminOrganizationEditPage({ params }: PageProps) {
  const { id: organizationId } = await params;
  const { supabase, user, profile } = await requireGlobalAdmin();

  const [
    { data: organizationProfileRaw, error: showcaseError },
    { data: branches, error: branchesError },
    { data: organization, error: organizationError },
  ] = await Promise.all([
    supabase
      .from("organization_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_branches")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("organizations")
      .select("name, org_type")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  if (showcaseError || branchesError || organizationError) {
    console.error("[AdminOrganizationEditPage]", {
      showcaseError: showcaseError?.message,
      branchesError: branchesError?.message,
      organizationError: organizationError?.message,
    });
    throw new Error("Не удалось загрузить данные учебного центра");
  }

  if (!organizationProfileRaw || organizationProfileRaw.deleted_at) {
    notFound();
  }

  const organizationProfile = await getOrganizationProfileWithBillingLegal(
    supabase,
    organizationProfileRaw,
    organizationId,
  );

  if (!organizationProfile) {
    notFound();
  }

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Администратор";

  const brandName = resolveOrganizationBrandName(
    organizationProfile.public_name,
    organization?.name?.trim() || "Учебный центр",
  );
  const status = parseShowcaseStatus(organizationProfile.status);
  const organizationType: OrganizationTypeValue = organization?.org_type ?? "school";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex flex-col gap-4">
            <Button asChild variant="ghost" className="w-fit px-0">
              <Link href="/dashboard/admin/organizations">
                <ArrowLeftIcon className="size-4" aria-hidden />
                <span className="ml-2">К модерации организаций</span>
              </Link>
            </Button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {brandName}
                  </h1>
                  <Badge variant="outline">{statusLabel(status)}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  Редактирование витрины учебного центра от имени
                  администратора платформы. Изменения не отправляют профиль на
                  повторную модерацию автоматически.
                </p>
                {organizationProfile.rejection_reason ? (
                  <p className="text-destructive text-sm">
                    Причина отклонения: {organizationProfile.rejection_reason}
                  </p>
                ) : null}
              </div>

              {organizationProfile.slug ? (
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
          </div>

          <ProfileForm
            profile={organizationProfile}
            branches={branches ?? []}
            organizationId={organizationId}
            organizationType={organizationType}
            adminMode
          />
        </div>
      </div>
    </>
  );
}
