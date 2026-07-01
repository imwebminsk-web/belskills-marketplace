"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import type { CourseModerationStatus } from "@/lib/course/course-status";
import { createClient } from "@/lib/supabase/server";

type ActionError = { success: false; error: string };
type ActionOk = { success: true };

const courseIdSchema = z.string().uuid("Некорректный ID курса");

const adminCourseStatusSchema = z.enum([
  "published",
  "rejected",
  "hidden",
] satisfies readonly CourseModerationStatus[]);

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

function revalidateCoursePaths(slug?: string | null) {
  revalidatePath("/dashboard/admin/courses");
  revalidatePath("/");
  revalidatePath("/dashboard/courses");
  if (slug?.trim()) {
    revalidatePath(`/courses/${encodeURIComponent(slug.trim())}`);
    revalidatePath(`/dashboard/courses/${encodeURIComponent(slug.trim())}`);
  }
}

export async function adminUpdateCourseStatus(
  courseId: string,
  status: z.infer<typeof adminCourseStatusSchema>,
  rejectionReason?: string | null,
): Promise<ActionOk | ActionError> {
  const auth = await requireAdminClient();
  if (!auth.success) {
    return auth;
  }

  const parsedId = courseIdSchema.safeParse(courseId);
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Некорректный ID курса",
    };
  }

  const parsedStatus = adminCourseStatusSchema.safeParse(status);
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

  const { data: course, error: fetchError } = await auth.supabase
    .from("courses")
    .select("id, status, slug")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (fetchError) {
    console.error("[adminUpdateCourseStatus] fetch", fetchError.message);
    return { success: false, error: fetchError.message };
  }

  if (!course) {
    return { success: false, error: "Курс не найден." };
  }

  const currentStatus = course.status as CourseModerationStatus;

  if (parsedStatus.data === "published" && currentStatus !== "moderation") {
    return {
      success: false,
      error: "Одобрить можно только курс на модерации.",
    };
  }

  if (parsedStatus.data === "rejected" && currentStatus !== "moderation") {
    return {
      success: false,
      error: "Отклонить можно только курс на модерации.",
    };
  }

  if (parsedStatus.data === "hidden" && currentStatus !== "published") {
    return {
      success: false,
      error: "Снять с публикации можно только опубликованный курс.",
    };
  }

  const { error: updateError } = await auth.supabase
    .from("courses")
    .update({
      status: parsedStatus.data,
      rejection_reason:
        parsedStatus.data === "rejected" ? trimmedReason : null,
    })
    .eq("id", parsedId.data);

  if (updateError) {
    console.error("[adminUpdateCourseStatus] update", updateError.message);
    return { success: false, error: "Не удалось обновить статус курса." };
  }

  revalidateCoursePaths(course.slug);
  return { success: true };
}

export async function adminApproveCourse(
  courseId: string,
): Promise<ActionOk | ActionError> {
  return adminUpdateCourseStatus(courseId, "published");
}

export async function adminRejectCourse(
  courseId: string,
  rejectionReason: string,
): Promise<ActionOk | ActionError> {
  return adminUpdateCourseStatus(courseId, "rejected", rejectionReason);
}

export async function adminUnpublishCourse(
  courseId: string,
): Promise<ActionOk | ActionError> {
  return adminUpdateCourseStatus(courseId, "hidden");
}
