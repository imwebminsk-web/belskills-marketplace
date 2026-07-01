import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

import { getTaxonomies } from "@/app/actions/taxonomy-actions";
import { CourseEditorTabs } from "@/components/dashboard/teacher/course-editor-tabs";
import { CourseModerationHeader } from "@/components/dashboard/teacher/course-moderation-header";
import type { CurriculumModuleRow } from "@/components/dashboard/teacher/curriculum-tab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { canManageCourse, hasStaffAccess } from "@/lib/auth/access";
import { parseCourseStatus } from "@/lib/course/course-status";
import { getUserTenantsSafe } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Сегмент пути может прийти в percent-encoding; в БД хранится декодированный slug. */
function decodeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: slugParam } = await params;
  const decodedSlug = decodeSlugParam(slugParam);
  return {
    title: `Редактирование: ${decodedSlug}`,
    description: "Настройки и программа курса",
  };
}

export default async function DashboardCourseEditPage({ params }: PageProps) {
  const { slug: slugParam } = await params;
  const decodedSlug = decodeSlugParam(slugParam);
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
      .select("full_name, is_global_admin")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTenantsSafe(user.id),
  ]);

  if (profileError || !profile) {
    redirect("/login");
  }

  if (!hasStaffAccess(profile, tenants)) {
    redirect("/dashboard");
  }

  const { data: courseRow, error } = await supabase
    .from("courses")
    .select(
      `
      id,
      title,
      description,
      detailed_description,
      price,
      status,
      rejection_reason,
      slug,
      image_url,
      youtube_url,
      vimeo_url,
      category_id,
      subcategory_id,
      marketing_tag_id,
      has_demo,
      is_belskills_partner,
      has_certificate,
      marketing_audience,
      delivery_format,
      promotional_images,
      duration_value,
      duration_unit,
      start_date,
      organization_id,
      modules (
        id,
        title,
        order_index,
        lessons (
          id,
          title,
          is_published,
          order_index,
          test_id
        )
      )
    `,
    )
    .eq("slug", decodedSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (
    !courseRow ||
    !canManageCourse(profile, tenants, courseRow)
  ) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
        <Button variant="ghost" className="w-fit px-0" asChild>
          <Link href="/dashboard/courses">← Назад</Link>
        </Button>
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-4 py-6 text-sm"
          role="alert"
        >
          <p className="font-medium">Курс не найден.</p>
          <p className="mt-2 font-mono text-xs opacity-90">
            Ожидаемый slug (после decode): {decodedSlug}. Сырой сегмент URL:{" "}
            <span className="break-all">{slugParam}</span>. Проверьте базу данных
            (таблица{" "}
            <code className="bg-muted rounded px-1">courses</code>, поля{" "}
            <code className="bg-muted rounded px-1">slug</code> и{" "}
            <code className="bg-muted rounded px-1">organization_id</code>).
          </p>
        </div>
      </div>
    );
  }

  const taxonomiesRes = await getTaxonomies();

  const courseStatus = parseCourseStatus(courseRow.status);
  const rejectionReason = courseRow.rejection_reason?.trim() ?? null;

  const course = {
    id: courseRow.id,
    title: courseRow.title,
    description: courseRow.description,
    detailed_description: courseRow.detailed_description,
    price: courseRow.price,
    status: courseRow.status,
    slug: courseRow.slug,
    image_url: courseRow.image_url,
    youtube_url: courseRow.youtube_url,
    vimeo_url: courseRow.vimeo_url,
    category_id: courseRow.category_id,
    subcategory_id: courseRow.subcategory_id,
    marketing_tag_id: courseRow.marketing_tag_id,
    has_demo: courseRow.has_demo,
    is_belskills_partner: courseRow.is_belskills_partner,
    has_certificate: courseRow.has_certificate,
    marketing_audience: courseRow.marketing_audience,
    promotional_images: courseRow.promotional_images ?? [],
    duration_value: courseRow.duration_value,
    duration_unit: courseRow.duration_unit,
    start_date: courseRow.start_date,
    delivery_format: courseRow.delivery_format,
  };

  const rawModules = courseRow.modules ?? [];
  const modules: CurriculumModuleRow[] = rawModules
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((m) => ({
      id: m.id,
      title: m.title,
      order_index: m.order_index,
      lessons: (m.lessons ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    }));

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8">
      <Button variant="ghost" className="w-fit px-0" asChild>
        <Link href="/dashboard/courses">← Назад</Link>
      </Button>

      {courseStatus === "rejected" ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Курс отклонён модератором</AlertTitle>
          <AlertDescription>
            {rejectionReason ||
              "Исправьте замечания и отправьте курс на повторную проверку."}
          </AlertDescription>
        </Alert>
      ) : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {course.title}
          </h1>
          <p className="text-muted-foreground font-mono text-xs">
            /{course.slug}
          </p>
        </div>
        <CourseModerationHeader
          courseId={course.id}
          status={courseStatus}
        />
      </header>

      <CourseEditorTabs
        course={course}
        modules={modules}
        taxonomies={
          taxonomiesRes?.success && taxonomiesRes?.data ? taxonomiesRes.data : []
        }
      />
    </div>
  );
}
