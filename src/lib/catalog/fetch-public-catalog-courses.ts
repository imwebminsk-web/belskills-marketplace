import type { PublicCourseCardModel } from "@/components/public/public-course-card";
import type { CatalogFiltersApplied } from "@/lib/catalog-filter-params";
import { taxonomyLabelForValue } from "@/lib/catalog-taxonomies";
import type { CatalogTaxonomy } from "@/lib/catalog-taxonomies";
import type { Database } from "@/types/database.types";

type CourseLevel = Database["public"]["Enums"]["course_level"];
type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

const CATALOG_SELECT =
  "id, title, slug, description, image_url, price, marketing_audience, level, age_group, target_audience, delivery_format, language" as const;

/**
 * Публичный каталог: опубликованные курсы.
 * Каскадное скрытие (курс виден только при published-организации) обеспечивается RLS
 * `courses_select_visible` в миграции organization_rejection_and_courses_cascade.
 */
export async function fetchPublicCatalogCourses(
  supabase: SupabaseServerClient,
  filters: CatalogFiltersApplied,
  taxonomies: CatalogTaxonomy[],
): Promise<PublicCourseCardModel[]> {
  let query = supabase
    .from("courses")
    .select(CATALOG_SELECT)
    .eq("status", "published");

  const audienceLabel = taxonomyLabelForValue(
    taxonomies,
    "audience",
    filters.audience,
  );
  if (audienceLabel) {
    query = query.eq("marketing_audience", audienceLabel);
  }

  const formatLabel = taxonomyLabelForValue(
    taxonomies,
    "format",
    filters.format,
  );
  if (formatLabel) {
    query = query.eq("delivery_format", formatLabel);
  }

  const languageLabel = taxonomyLabelForValue(
    taxonomies,
    "language",
    filters.language,
  );
  if (languageLabel) {
    query = query.eq("language", languageLabel);
  }

  if (filters.audience === "children" && filters.age) {
    const ageLabel = taxonomyLabelForValue(taxonomies, "age_group", filters.age);
    if (ageLabel) {
      query = query.eq("age_group", ageLabel);
    }
  }

  if (filters.audience === "adults" && filters.level) {
    const levelLabel = taxonomyLabelForValue(
      taxonomies,
      "cefr_level",
      filters.level,
    );
    if (levelLabel) {
      query = query.eq("level", levelLabel as CourseLevel);
    }
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPublicCatalogCourses]", error.message);
    return [];
  }

  return data ?? [];
}
