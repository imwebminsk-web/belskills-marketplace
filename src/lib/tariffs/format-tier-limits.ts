import type { Json } from "@/types/database.types";

export type TierLimits = {
  max_courses?: number | null;
  max_lessons?: number | null;
  lms_unlocked?: boolean;
  max_users?: number | null;
};

export type TariffCategory = "catalog" | "lms" | "corporate" | "free";

export const TARIFF_CATEGORY_TABS: ReadonlyArray<{
  value: TariffCategory;
  label: string;
}> = [
  { value: "catalog", label: "Каталог" },
  { value: "lms", label: "Платформа для обучения" },
  { value: "corporate", label: "Корпоративный портал" },
  { value: "free", label: "Бесплатные" },
];

export const LEGACY_TARIFF_IDS = ["basic", "pro", "premium"] as const;

export type { TariffGroupingInput } from "@/lib/tariffs/group-tariffs";
export {
  groupTariffsByCategory,
  isFreeTariff,
  resolveTariffPriceKopecks,
} from "@/lib/tariffs/group-tariffs";

function parseTierLimits(limits: Json | null | undefined): TierLimits {
  if (!limits || typeof limits !== "object" || Array.isArray(limits)) {
    return {};
  }

  return limits as TierLimits;
}

function formatCourseLimit(maxCourses: number | null | undefined): string {
  if (maxCourses === null || maxCourses === undefined) {
    return "Курсы: безлимит";
  }

  return `До ${maxCourses} курсов`;
}

function formatLessonLimit(maxLessons: number | null | undefined): string | null {
  if (maxLessons === null || maxLessons === undefined) {
    return "Уроки: безлимит";
  }

  return `До ${maxLessons} уроков в курсе`;
}

export function buildTierLimitLines(
  limitsJson: Json | null | undefined,
  category: string | null | undefined,
): string[] {
  const limits = parseTierLimits(limitsJson);
  const resolvedCategory = (category ?? "catalog") as TariffCategory;
  const lines: string[] = [];

  if (resolvedCategory === "corporate") {
    if (limits.max_users !== null && limits.max_users !== undefined) {
      lines.push(`До ${limits.max_users} сотрудников`);
    }

    if (limits.lms_unlocked) {
      lines.push("Система обучения (LMS)");
    }

    lines.push(formatCourseLimit(limits.max_courses));
    return lines;
  }

  if (resolvedCategory === "lms") {
    lines.push(formatCourseLimit(limits.max_courses));

    const lessonLine = formatLessonLimit(limits.max_lessons);
    if (lessonLine) {
      lines.push(lessonLine);
    }

    if (limits.lms_unlocked) {
      lines.push("Система обучения (LMS)");
    }

    return lines;
  }

  lines.push(formatCourseLimit(limits.max_courses));

  const lessonLine = formatLessonLimit(limits.max_lessons);
  if (lessonLine && limits.max_lessons !== null && limits.max_lessons !== undefined) {
    lines.push(lessonLine);
  }

  return lines;
}
