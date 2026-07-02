import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarIcon } from "lucide-react";

import {
  SchoolCoursesStub,
  SchoolShowcaseTabs,
} from "@/components/showcase/school-showcase-tabs";
import { WithSiteHeader } from "@/components/site/with-site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  messengerContactHref,
  websiteContactHref,
} from "@/lib/organization/messenger-links";
import {
  collectSocialLinkEntries,
  normalizeGalleryUrls,
  normalizePhoneList,
  parseProfileMessengers,
} from "@/lib/organization/showcase-profile";
import { parseShowcaseStatus } from "@/lib/organization/profile-status";
import { createClient } from "@/lib/supabase/server";
import { normalizeRichTextHtml } from "@/lib/utils/rich-text-content";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type BranchRow = Pick<
  Database["public"]["Tables"]["organization_branches"]["Row"],
  "id" | "city" | "address" | "label" | "phone" | "created_at"
>;

type MessengerKey = "telegram" | "viber" | "whatsapp";

async function isPlatformAdminViewer(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) {
    console.error("[SchoolPage] is_platform_admin", error.message);
    return false;
  }
  return data === true;
}

async function fetchSchoolProfileRow<T extends string>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  allowUnpublished: boolean,
  columns: T,
) {
  let query = supabase
    .from("organization_profiles")
    .select(columns)
    .eq("slug", slug)
    .is("deleted_at", null);

  if (!allowUnpublished) {
    query = query.eq("status", "published");
  }

  return query.maybeSingle();
}

function decodeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function HeroStarRatingStub() {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Рейтинг: 5 из 5, 0 отзывов"
    >
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon
            key={index}
            className="size-4 fill-amber-400 text-amber-400"
          />
        ))}
      </div>
      <span className="text-muted-foreground text-sm">0 отзывов</span>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const supabase = await createClient();
  const allowUnpublished = await isPlatformAdminViewer(supabase);

  const { data: profile } = await fetchSchoolProfileRow(
    supabase,
    slug,
    allowUnpublished,
    "public_name, short_description, logo_url, cover_url",
  );

  if (!profile) {
    return {
      title: "Школа не найдена",
      robots: { index: false, follow: false },
    };
  }

  const title = profile.public_name;
  const description =
    profile.short_description?.trim() ||
    `Учебный центр «${profile.public_name}» на BelSkills.`;
  const ogImage = profile.cover_url ?? profile.logo_url ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function SchoolPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const supabase = await createClient();
  const allowUnpublished = await isPlatformAdminViewer(supabase);

  const { data: profileStub, error: profileStubError } =
    await fetchSchoolProfileRow(
      supabase,
      slug,
      allowUnpublished,
      "id, organization_id, status",
    );

  if (profileStubError) {
    console.error("[SchoolPage] profile lookup", profileStubError.message);
    throw new Error("Не удалось загрузить витрину учебного центра");
  }

  if (!profileStub) {
    notFound();
  }

  const [
    { data: profile, error: profileError },
    { data: branches, error: branchesError },
  ] = await Promise.all([
    supabase
      .from("organization_profiles")
      .select(
        `
        id,
        organization_id,
        public_name,
        short_description,
        long_description,
        logo_url,
        cover_url,
        website,
        phone_main,
        phones,
        social_links,
        unp,
        legal_name,
        gallery,
        messengers
      `,
      )
      .eq("id", profileStub.id)
      .single(),
    supabase
      .from("organization_branches")
      .select("id, city, address, label, phone, created_at")
      .eq("organization_id", profileStub.organization_id)
      .order("created_at", { ascending: true }),
  ]);

  if (profileError || !profile) {
    console.error("[SchoolPage] profile", profileError?.message);
    throw new Error("Не удалось загрузить витрину учебного центра");
  }

  if (branchesError) {
    console.error("[SchoolPage] branches", branchesError.message);
    throw new Error("Не удалось загрузить филиалы учебного центра");
  }

  const messengers = parseProfileMessengers(profile.messengers);
  const branchRows = (branches ?? []) as BranchRow[];
  const phoneList = normalizePhoneList(profile.phones, profile.phone_main);
  const galleryUrls = normalizeGalleryUrls(profile.gallery);
  const socialEntries = collectSocialLinkEntries(profile.social_links);

  const longDescriptionHtml = profile.long_description
    ? normalizeRichTextHtml(profile.long_description)
    : "";

  const websiteHref = profile.website
    ? websiteContactHref(profile.website)
    : null;

  const messengerIconLinks = (
    [
      { key: "telegram" as const, label: "Telegram" as const, value: messengers.telegram },
      { key: "viber" as const, label: "Viber" as const, value: messengers.viber },
      { key: "whatsapp" as const, label: "WhatsApp" as const, value: messengers.whatsapp },
    ] as const
  )
    .map((entry) => {
      const href = messengerContactHref(entry.key, entry.value);
      if (!href) {
        return null;
      }
      return { key: entry.key, label: entry.label, href };
    })
    .filter(
      (
        entry,
      ): entry is {
        key: MessengerKey;
        href: string;
        label: "Telegram" | "Viber" | "WhatsApp";
      } => entry !== null,
    );

  const hasLegalFooter =
    Boolean(profile.legal_name?.trim()) || Boolean(profile.unp?.trim());

  const previewStatus = profileStub.status
    ? parseShowcaseStatus(profileStub.status)
    : null;
  const showAdminPreviewBanner =
    allowUnpublished && previewStatus != null && previewStatus !== "published";

  return (
    <WithSiteHeader>
      <div className="bg-background min-h-screen">
        {showAdminPreviewBanner ? (
          <div className="mx-auto max-w-6xl px-4 pt-4 md:px-8">
            <Alert>
              <AlertDescription>
                Режим предпросмотра для администратора: витрина в статусе «
                {previewStatus}» и не видна обычным посетителям каталога.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
        {/* Hero — Job Board style */}
        <section
          aria-label="Учебный центр"
          className="border-border/60 border-b bg-background"
        >
          <div
            className="h-32 w-full bg-gradient-to-r from-brand/20 to-brand/5 lg:h-48 dark:from-brand/20 dark:to-brand/10"
            aria-hidden
          />

          <div className="mx-auto max-w-6xl">
            <div className="relative z-10 mt-0 flex flex-col justify-between gap-8 px-4 lg:flex-row lg:items-start lg:px-8">
              <div className="min-w-0 flex-1">
                {profile.logo_url ? (
                  <div className="border-background relative z-10 -mt-12 ml-4 w-fit rounded-xl border-4 bg-white p-1 shadow-md lg:ml-8 dark:bg-white">
                    <div className="size-20 overflow-hidden rounded-lg sm:size-24">
                      <Image
                        src={profile.logo_url}
                        alt={`Логотип ${profile.public_name}`}
                        width={96}
                        height={96}
                        className="size-full object-cover"
                        unoptimized
                        priority
                      />
                    </div>
                  </div>
                ) : null}

                <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                  {profile.public_name}
                </h1>
              </div>

              {profile.cover_url ? (
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border shadow-lg lg:-mt-[140px] lg:w-[500px]">
                  <Image
                    src={profile.cover_url}
                    alt={`Обложка ${profile.public_name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 500px"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className="bg-muted/60 border-border aspect-video w-full shrink-0 rounded-xl border border-dashed lg:-mt-[140px] lg:w-[500px]"
                  aria-hidden
                />
              )}
            </div>

            <div className="mt-6 px-4 pb-8 lg:max-w-3xl lg:px-8 md:pb-10">
              {profile.short_description ? (
                <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
                  {profile.short_description}
                </p>
              ) : null}
              <div className="mt-4">
                <HeroStarRatingStub />
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <SchoolShowcaseTabs
            longDescriptionHtml={longDescriptionHtml}
            galleryUrls={galleryUrls}
            phoneList={phoneList}
            website={profile.website}
            websiteHref={websiteHref}
            socialEntries={socialEntries}
            messengerIconLinks={messengerIconLinks}
            branchRows={branchRows}
          />

          <section className="mt-12" aria-label="Курсы">
            <SchoolCoursesStub />
          </section>

          {hasLegalFooter ? (
            <footer className="text-muted-foreground mt-10 border-t pt-6 text-xs leading-relaxed">
              {profile.legal_name?.trim() ? (
                <p>{profile.legal_name.trim()}</p>
              ) : null}
              {profile.unp?.trim() ? (
                <p className="mt-1">УНП {profile.unp.trim()}</p>
              ) : null}
            </footer>
          ) : null}

          <div className="mt-6">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              Вернуться на главную
            </Link>
          </div>
        </main>
      </div>
    </WithSiteHeader>
  );
}
