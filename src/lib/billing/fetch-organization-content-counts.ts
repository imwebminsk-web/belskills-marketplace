import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type DbClient = SupabaseClient<Database>;

export async function fetchOrganizationContentCounts(
  supabase: DbClient,
  organizationId: string,
): Promise<{ currentCourseCount: number; totalLessonCount: number }> {
  const [{ count: courseCount, error: courseError }, { count: lessonCount, error: lessonError }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("lessons")
        .select("id, modules!inner(courses!inner(organization_id))", {
          count: "exact",
          head: true,
        })
        .eq("modules.courses.organization_id", organizationId),
    ]);

  if (courseError) {
    console.error("[fetchOrganizationContentCounts] courses", courseError.message);
  }

  if (lessonError) {
    console.error("[fetchOrganizationContentCounts] lessons", lessonError.message);
  }

  return {
    currentCourseCount: courseCount ?? 0,
    totalLessonCount: lessonCount ?? 0,
  };
}
