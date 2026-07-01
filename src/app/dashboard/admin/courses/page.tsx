import type { Metadata } from "next";

import { CoursesAdminClient } from "@/components/dashboard/admin/courses-admin-client";
import { SiteHeader } from "@/components/site-header";
import { requireGlobalAdmin } from "@/lib/auth/access";
import {
  parseCourseStatus,
  type CourseModerationStatus,
} from "@/lib/course/course-status";

export const metadata: Metadata = {
  title: "Модерация курсов",
  description: "Проверка и публикация курсов на платформе BelSkills",
};

export type AdminCourseRow = {
  courseId: string;
  title: string;
  organizationName: string;
  status: CourseModerationStatus;
  rejectionReason: string | null;
  createdAt: string;
  slug: string;
};

export default async function AdminCoursesPage() {
  const { supabase, user, profile } = await requireGlobalAdmin();

  const { data: rows, error } = await supabase
    .from("courses")
    .select(
      `
        id,
        title,
        status,
        rejection_reason,
        created_at,
        slug,
        organizations (
          name,
          organization_profiles (
            public_name
          )
        )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminCoursesPage]", error.message);
    throw new Error("Не удалось загрузить курсы");
  }

  const courses: AdminCourseRow[] = (rows ?? []).map((row) => {
    const organization = row.organizations as {
      name: string;
      organization_profiles: { public_name: string } | { public_name: string }[] | null;
    } | null;

    const profileRow = organization?.organization_profiles;
    const publicName = Array.isArray(profileRow)
      ? profileRow[0]?.public_name
      : profileRow?.public_name;

    return {
      courseId: row.id,
      title: row.title?.trim() || "Без названия",
      organizationName:
        publicName?.trim() ||
        organization?.name?.trim() ||
        "Организация не указана",
      status: parseCourseStatus(row.status),
      rejectionReason: row.rejection_reason ?? null,
      createdAt: row.created_at,
      slug: row.slug,
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
          <h1 className="text-2xl font-bold tracking-tight">Модерация курсов</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Одобряйте курсы перед публикацией в каталоге. Курс виден посетителям
            только при статусе «Опубликовано» и опубликованной организации.
          </p>
        </div>
        <CoursesAdminClient initialCourses={courses} />
      </div>
    </>
  );
}
