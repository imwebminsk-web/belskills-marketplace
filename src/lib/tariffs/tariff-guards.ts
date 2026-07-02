import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { TierLimits } from "@/lib/tariffs/format-tier-limits";
import type { Database, Json } from "@/types/database.types";

type DbClient = SupabaseClient<Database>;

export type OrganizationTariffLimits = {
  can_create_structure: boolean;
  max_content_lessons: number | null;
  force_demo: boolean;
};

export const FREE_STRUCTURE_ERROR =
  "На бесплатном тарифе создание структуры курса недоступно";

export const DEMO_LESSON_LIMIT_ERROR =
  "Достигнут лимит в 3 демо-урока";

const EMPTY_HTML = "<p></p>";

function parseTierLimits(limits: Json | null | undefined): TierLimits {
  if (!limits || typeof limits !== "object" || Array.isArray(limits)) {
    return {};
  }

  return limits as TierLimits;
}

function isEmptyLimitsJson(limits: Json | null | undefined): boolean {
  if (!limits || typeof limits !== "object" || Array.isArray(limits)) {
    return true;
  }

  return Object.keys(limits).length === 0;
}

function isFreeTier(
  tier: Database["public"]["Tables"]["subscription_tiers"]["Row"] | null,
): boolean {
  if (!tier) {
    return true;
  }

  if (tier.price_monthly === 0 || tier.id === "free") {
    return true;
  }

  return isEmptyLimitsJson(tier.limits);
}

export function deriveOrganizationTariffLimits(
  tier: Database["public"]["Tables"]["subscription_tiers"]["Row"] | null,
): OrganizationTariffLimits {
  if (isFreeTier(tier)) {
    return {
      can_create_structure: false,
      max_content_lessons: null,
      force_demo: false,
    };
  }

  const limits = parseTierLimits(tier?.limits);

  if (limits.lms_unlocked === true) {
    return {
      can_create_structure: true,
      max_content_lessons: null,
      force_demo: false,
    };
  }

  return {
    can_create_structure: true,
    max_content_lessons: limits.max_lessons ?? 3,
    force_demo: true,
  };
}

export async function getOrganizationTariffLimits(
  orgId: string,
  supabase?: DbClient,
): Promise<OrganizationTariffLimits> {
  const client = supabase ?? (await createClient());

  const { data: organization, error: orgError } = await client
    .from("organizations")
    .select("tier_id")
    .eq("id", orgId)
    .maybeSingle();

  if (orgError) {
    console.error("[getOrganizationTariffLimits] org", orgError.message);
    return deriveOrganizationTariffLimits(null);
  }

  const tierId = organization?.tier_id?.trim();
  if (!tierId) {
    return deriveOrganizationTariffLimits(null);
  }

  const { data: tier, error: tierError } = await client
    .from("subscription_tiers")
    .select("*")
    .eq("id", tierId)
    .eq("is_active", true)
    .maybeSingle();

  if (tierError) {
    console.error("[getOrganizationTariffLimits] tier", tierError.message);
    return deriveOrganizationTariffLimits(null);
  }

  return deriveOrganizationTariffLimits(tier);
}

function readHtml(content: Json): string {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return EMPTY_HTML;
  }

  const record = content as Record<string, unknown>;
  if (typeof record.html === "string") {
    return record.html;
  }
  if (typeof record.body === "string") {
    return record.body;
  }

  return EMPTY_HTML;
}

function readUrl(content: Json): string {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "";
  }

  const record = content as Record<string, unknown>;
  return typeof record.url === "string" ? record.url.trim() : "";
}

function isTextContentFilled(content: Json): boolean {
  const html = readHtml(content);
  const stripped = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped.length > 0;
}

export function isContentBlockFilled(
  blockType: string,
  content: Json,
): boolean {
  if (blockType === "text") {
    return isTextContentFilled(content);
  }

  if (blockType === "youtube" || blockType === "vimeo") {
    return readUrl(content).length > 0;
  }

  return false;
}

export function blockRowHasContent(block: {
  type: string;
  content: Json;
}): boolean {
  return isContentBlockFilled(block.type, block.content);
}

export async function getLessonCourseContext(
  supabase: DbClient,
  lessonId: string,
): Promise<{
  courseId: string;
  organizationId: string | null;
  slug: string;
} | null> {
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return null;
  }

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .maybeSingle();

  if (moduleError || !module) {
    return null;
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, organization_id")
    .eq("id", module.course_id)
    .maybeSingle();

  if (courseError || !course) {
    return null;
  }

  return {
    courseId: course.id,
    organizationId: course.organization_id,
    slug: course.slug,
  };
}

export async function lessonHasContent(
  supabase: DbClient,
  lessonId: string,
): Promise<boolean> {
  const { data: blocks, error } = await supabase
    .from("lesson_blocks")
    .select("type, content")
    .eq("lesson_id", lessonId);

  if (error) {
    console.error("[lessonHasContent]", error.message);
    return false;
  }

  return (blocks ?? []).some((block) => blockRowHasContent(block));
}

export async function countCourseLessonsWithContent(
  supabase: DbClient,
  courseId: string,
): Promise<number> {
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  if (modulesError) {
    console.error("[countCourseLessonsWithContent] modules", modulesError.message);
    return 0;
  }

  const moduleIds = (modules ?? []).map((row) => row.id);
  if (moduleIds.length === 0) {
    return 0;
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id")
    .in("module_id", moduleIds);

  if (lessonsError) {
    console.error("[countCourseLessonsWithContent] lessons", lessonsError.message);
    return 0;
  }

  const lessonIds = (lessons ?? []).map((row) => row.id);
  if (lessonIds.length === 0) {
    return 0;
  }

  const { data: blocks, error: blocksError } = await supabase
    .from("lesson_blocks")
    .select("lesson_id, type, content")
    .in("lesson_id", lessonIds);

  if (blocksError) {
    console.error("[countCourseLessonsWithContent] blocks", blocksError.message);
    return 0;
  }

  const lessonsWithContent = new Set<string>();
  for (const block of blocks ?? []) {
    if (blockRowHasContent(block)) {
      lessonsWithContent.add(block.lesson_id);
    }
  }

  return lessonsWithContent.size;
}

export type CourseContentStats = {
  filledLessonsCount: number;
  currentLessonHasContent: boolean;
};

export async function getCourseContentStats(
  supabase: DbClient,
  courseId: string,
  currentLessonId?: string,
): Promise<CourseContentStats> {
  const filledLessonsCount = await countCourseLessonsWithContent(
    supabase,
    courseId,
  );

  if (!currentLessonId) {
    return {
      filledLessonsCount,
      currentLessonHasContent: false,
    };
  }

  const currentLessonHasContent = await lessonHasContent(
    supabase,
    currentLessonId,
  );

  return {
    filledLessonsCount,
    currentLessonHasContent,
  };
}

export function isContentEditingBlocked(
  limits: OrganizationTariffLimits,
  stats: CourseContentStats,
): boolean {
  if (limits.max_content_lessons === null) {
    return false;
  }

  if (stats.currentLessonHasContent) {
    return false;
  }

  return stats.filledLessonsCount >= limits.max_content_lessons;
}

export async function assertCanCreateStructure(
  supabase: DbClient,
  organizationId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!organizationId) {
    return { ok: false, error: FREE_STRUCTURE_ERROR };
  }

  const limits = await getOrganizationTariffLimits(organizationId, supabase);

  if (!limits.can_create_structure) {
    return { ok: false, error: FREE_STRUCTURE_ERROR };
  }

  return { ok: true };
}

export async function assertCanFillLessonContent(
  supabase: DbClient,
  organizationId: string | null,
  courseId: string,
  lessonId: string,
  blockType: string,
  content: Json,
): Promise<
  | { ok: true; forceDemo: boolean }
  | { ok: false; error: string }
> {
  if (!isContentBlockFilled(blockType, content)) {
    return { ok: true, forceDemo: false };
  }

  const limits = organizationId
    ? await getOrganizationTariffLimits(organizationId, supabase)
    : deriveOrganizationTariffLimits(null);

  if (limits.max_content_lessons === null) {
    return { ok: true, forceDemo: limits.force_demo };
  }

  const alreadyHasContent = await lessonHasContent(supabase, lessonId);
  if (alreadyHasContent) {
    return { ok: true, forceDemo: limits.force_demo };
  }

  const filledCount = await countCourseLessonsWithContent(supabase, courseId);
  if (filledCount >= limits.max_content_lessons) {
    return { ok: false, error: DEMO_LESSON_LIMIT_ERROR };
  }

  return { ok: true, forceDemo: limits.force_demo };
}

export async function applyForceDemoFlagIfNeeded(
  supabase: DbClient,
  lessonId: string,
  forceDemo: boolean,
): Promise<void> {
  if (!forceDemo) {
    return;
  }

  const { error } = await supabase
    .from("lessons")
    .update({ is_demo: true })
    .eq("id", lessonId);

  if (error) {
    console.error("[applyForceDemoFlagIfNeeded]", error.message);
  }
}
