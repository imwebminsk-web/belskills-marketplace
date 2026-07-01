import type { Database } from "@/types/database.types";

export type CourseModerationStatus =
  Database["public"]["Enums"]["course_status"];

export const COURSE_MODERATION_STATUSES = [
  "draft",
  "moderation",
  "published",
  "hidden",
  "rejected",
] as const satisfies readonly CourseModerationStatus[];

export function parseCourseStatus(
  value: string | null | undefined,
): CourseModerationStatus {
  if (
    value &&
    COURSE_MODERATION_STATUSES.includes(value as CourseModerationStatus)
  ) {
    return value as CourseModerationStatus;
  }
  return "draft";
}

export function isCoursePubliclyVisible(status: CourseModerationStatus): boolean {
  return status === "published";
}

export function courseStatusLabel(status: CourseModerationStatus): string {
  switch (status) {
    case "published":
      return "Опубликован";
    case "moderation":
      return "На проверке";
    case "rejected":
      return "Отклонён";
    case "hidden":
      return "Снят с публикации";
    case "draft":
    default:
      return "Черновик";
  }
}
