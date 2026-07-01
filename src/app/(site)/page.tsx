import type { Metadata } from "next";
import { Suspense } from "react";

import {
  LandingBenefits,
  LandingFooter,
  LandingReviews,
  LandingSalesCta,
  LandingTeachers,
} from "@/components/landing/landing-blocks";
import {
  CatalogFilters,
  CatalogFiltersFallback,
} from "@/components/landing/catalog-filters";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { PublishedCoursesStorefront } from "@/components/landing/published-courses-storefront";
import { fetchPublicCatalogCourses } from "@/lib/catalog/fetch-public-catalog-courses";
import {
  catalogHasActiveFilters,
  parseCatalogFilters,
} from "@/lib/catalog-filter-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "New Education — курсы языков в Минске | Новое образование",
  description:
    "Разговорные курсы иностранных языков в Минске. Оксфордская методика, малые группы, гибкая оплата. Первое занятие бесплатно.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: taxonomyRows, error: taxonomyError } = await supabase
    .from("taxonomies")
    .select("id, type, label, value, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (taxonomyError) {
    console.error("[Home] taxonomies", taxonomyError.message);
  }

  const taxonomies = taxonomyRows ?? [];
  const filters = parseCatalogFilters(sp, taxonomies);
  const hasFilters = catalogHasActiveFilters(filters);

  const courses = await fetchPublicCatalogCourses(supabase, filters, taxonomies);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <section
          id="course-catalog"
          className="scroll-mt-20 border-b pt-28 pb-16 sm:pt-32 sm:pb-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <PublishedCoursesStorefront
              courses={courses}
              filtersYieldEmpty={courses.length === 0 && hasFilters}
              toolbar={
                <Suspense fallback={<CatalogFiltersFallback />}>
                  <CatalogFilters taxonomies={taxonomies} />
                </Suspense>
              }
            />
          </div>
        </section>
        <LandingBenefits />
        <LandingTeachers />
        <LandingSalesCta />
        <LandingReviews />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
