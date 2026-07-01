import type { Metadata } from "next";

import { OrganizationsAdminClient } from "@/components/dashboard/admin/organizations-admin-client";
import { SiteHeader } from "@/components/site-header";
import { requireGlobalAdmin } from "@/lib/auth/access";
import {
  parseShowcaseStatus,
  type OrganizationShowcaseStatus,
} from "@/lib/organization/profile-status";

export const metadata: Metadata = {
  title: "Модерация организаций",
  description: "Проверка и публикация учебных центров на платформе BelSkills",
};

export type AdminOrganizationRow = {
  organizationId: string;
  displayName: string;
  status: OrganizationShowcaseStatus;
  rejectionReason: string | null;
  createdAt: string;
  slug: string | null;
};

export default async function AdminOrganizationsPage() {
  const { supabase, user, profile } = await requireGlobalAdmin();

  const { data: rows, error } = await supabase
    .from("organization_profiles")
    .select(
      `
        organization_id,
        public_name,
        status,
        rejection_reason,
        created_at,
        slug,
        organizations (
          name,
          created_at
        )
      `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminOrganizationsPage]", error.message);
    throw new Error("Не удалось загрузить организации");
  }

  const organizations: AdminOrganizationRow[] = (rows ?? []).map((row) => {
    const organization = row.organizations as {
      name: string;
      created_at: string;
    } | null;

    return {
      organizationId: row.organization_id,
      displayName:
        row.public_name?.trim() ||
        organization?.name?.trim() ||
        "Без названия",
      status: parseShowcaseStatus(row.status),
      rejectionReason: row.rejection_reason ?? null,
      createdAt: organization?.created_at ?? row.created_at,
      slug: row.slug ?? null,
    };
  });

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Администратор";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Модерация организаций
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Одобряйте витрины учебных центров. Пока организация не опубликована,
            её курсы скрыты из публичного каталога.
          </p>
        </div>
        <OrganizationsAdminClient initialOrganizations={organizations} />
      </div>
    </>
  );
}
