import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpenIcon,
  CalendarIcon,
  GlobeIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
} from "lucide-react";

import { WithSiteHeader } from "@/components/site/with-site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  messengerContactHref,
  websiteContactHref,
} from "@/lib/organization/messenger-links";
import {
  collectSocialLinkEntries,
  isOrganizationSubscriptionActive,
  normalizeGalleryUrls,
  normalizePhoneList,
  parseProfileMessengers,
  resolveSocialIconPath,
  type SocialLinkEntry,
} from "@/lib/organization/showcase-profile";
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

function decodeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function formatRating(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPlatformSince(iso: string): string {
  const year = new Date(iso).getFullYear();
  if (Number.isNaN(year)) {
    return "На платформе с 2024";
  }
  return `На платформе с ${year}`;
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}

function SocialIconLink({ entry }: { entry: SocialLinkEntry }) {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-background hover:border-brand/40 flex size-10 items-center justify-center rounded-lg border transition-colors"
      aria-label={entry.label}
      title={entry.label}
    >
      <Image
        src={entry.iconPath}
        alt=""
        width={20}
        height={20}
        className="size-5"
        aria-hidden
      />
    </a>
  );
}

function MessengerIconLink({
  keyName,
  href,
  label,
}: {
  keyName: MessengerKey;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-background hover:border-brand/40 flex size-10 items-center justify-center rounded-lg border transition-colors"
      aria-label={label}
      title={label}
    >
      <Image
        src={resolveSocialIconPath(keyName)}
        alt=""
        width={20}
        height={20}
        className="size-5"
        aria-hidden
      />
    </a>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("organization_profiles")
    .select("public_name, short_description, logo_url, cover_url")
    .eq("slug", slug)
    .maybeSingle();

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

  const { data: profileStub, error: profileStubError } = await supabase
    .from("organization_profiles")
    .select("id, organization_id")
    .eq("slug", slug)
    .maybeSingle();

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
        email,
        phone_main,
        phones,
        social_links,
        unp,
        legal_name,
        gallery,
        messengers,
        rating_avg,
        reviews_count,
        created_at,
        organizations (
          id,
          name,
          tier_id,
          tier_expires_at
        )
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

  if (profileError) {
    console.error("[SchoolPage] profile", profileError.message);
    throw new Error("Не удалось загрузить витрину учебного центра");
  }

  if (!profile || !profile.organizations) {
    notFound();
  }

  if (branchesError) {
    console.error("[SchoolPage] branches", branchesError.message);
    throw new Error("Не удалось загрузить филиалы учебного центра");
  }

  const organization = profile.organizations;
  const isActive = isOrganizationSubscriptionActive(organization);
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

  const messengerIconLinks: {
    key: MessengerKey;
    href: string;
    label: string;
  }[] = (
    [
      { key: "telegram" as const, label: "Telegram", value: messengers.telegram },
      { key: "viber" as const, label: "Viber", value: messengers.viber },
      { key: "whatsapp" as const, label: "WhatsApp", value: messengers.whatsapp },
    ] as const
  )
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      href: messengerContactHref(entry.key, entry.value),
    }))
    .filter((entry): entry is { key: MessengerKey; href: string; label: string } =>
      Boolean(entry.href),
    );

  const hasLegalFooter =
    Boolean(profile.legal_name?.trim()) || Boolean(profile.unp?.trim());

  return (
    <WithSiteHeader>
      <div className="bg-background min-h-screen">
        {isActive ? (
          <div className="border-brand/30 bg-brand/5 border-b">
            <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2">
              <Badge variant="outline" className="border-brand text-brand">
                Предпросмотр
              </Badge>
            </div>
          </div>
        ) : null}

        <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            {/* LEFT COLUMN */}
            <div className="min-w-0 space-y-8 lg:col-span-8">
              <header
                aria-label="Учебный центр"
                className="flex flex-col gap-5 sm:flex-row sm:items-start"
              >
                {profile.logo_url ? (
                  <div className="bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border sm:size-24">
                    <Image
                      src={profile.logo_url}
                      alt={`Логотип ${profile.public_name}`}
                      width={96}
                      height={96}
                      className="size-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1 space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    {profile.public_name}
                  </h1>
                  {profile.short_description ? (
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {profile.short_description}
                    </p>
                  ) : null}
                </div>
              </header>

              <div
                aria-label="Статистика"
                className="bg-muted/50 flex flex-wrap gap-3 rounded-xl border p-4"
              >
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                  <BookOpenIcon className="size-4" aria-hidden />
                  12 курсов
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                  <StarIcon className="size-4 fill-current" aria-hidden />
                  {formatRating(profile.rating_avg)} ({profile.reviews_count}{" "}
                  {profile.reviews_count === 1
                    ? "отзыв"
                    : profile.reviews_count >= 2 && profile.reviews_count <= 4
                      ? "отзыва"
                      : "отзывов"}
                  )
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                  <CalendarIcon className="size-4" aria-hidden />
                  {formatPlatformSince(profile.created_at)}
                </Badge>
              </div>

              <section aria-label="О центре" className="space-y-4">
                <h2 className="text-xl font-semibold">О центре</h2>
                {longDescriptionHtml ? (
                  <div
                    className="prose prose-sm text-foreground max-w-none dark:prose-invert prose-img:max-w-full prose-img:rounded-md [&_iframe]:aspect-video [&_iframe]:w-full [&_video]:w-full"
                    dangerouslySetInnerHTML={{ __html: longDescriptionHtml }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Подробное описание скоро появится.
                  </p>
                )}
              </section>

              {galleryUrls.length > 0 ? (
                <section aria-label="Галерея" className="space-y-4">
                  <h2 className="text-xl font-semibold">Галерея</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {galleryUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg border"
                      >
                        <Image
                          src={url}
                          alt={`Фото учебного центра ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 240px"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {hasLegalFooter ? (
                <footer className="text-muted-foreground border-t pt-6 text-xs leading-relaxed">
                  {profile.legal_name?.trim() ? (
                    <p>{profile.legal_name.trim()}</p>
                  ) : null}
                  {profile.unp?.trim() ? (
                    <p className="mt-1">УНП {profile.unp.trim()}</p>
                  ) : null}
                </footer>
              ) : null}

              <div className="pt-2">
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                >
                  Вернуться на главную
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <aside className="space-y-6 lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
              {profile.cover_url ? (
                <div className="relative aspect-[3/2] overflow-hidden rounded-xl border shadow-sm">
                  <Image
                    src={profile.cover_url}
                    alt={`Обложка ${profile.public_name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 360px"
                    priority
                    unoptimized
                  />
                </div>
              ) : null}

              <Card className="py-0 shadow-sm">
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-3">
                    <Button type="button" className="w-full" size="lg">
                      Оставить заявку
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      size="lg"
                    >
                      Задать вопрос
                    </Button>
                  </div>

                  <Separator />

                  {(phoneList.length > 0 || websiteHref) && (
                    <section aria-label="Контакты" className="space-y-3">
                      <h2 className="text-sm font-semibold">Контакты</h2>
                      <div className="space-y-2">
                        {phoneList.map((phone) => (
                          <a
                            key={phone}
                            href={telHref(phone)}
                            className="hover:text-brand flex items-center gap-2 text-sm transition-colors"
                          >
                            <PhoneIcon className="size-4 shrink-0" aria-hidden />
                            <span>{phone}</span>
                          </a>
                        ))}
                        {websiteHref ? (
                          <a
                            href={websiteHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-brand flex items-center gap-2 text-sm transition-colors"
                          >
                            <GlobeIcon className="size-4 shrink-0" aria-hidden />
                            <span className="truncate">{profile.website}</span>
                          </a>
                        ) : null}
                      </div>
                    </section>
                  )}

                  {(socialEntries.length > 0 || messengerIconLinks.length > 0) && (
                    <>
                      <Separator />
                      <section
                        aria-label="Соцсети и мессенджеры"
                        className="space-y-3"
                      >
                        <h2 className="text-sm font-semibold">
                          Соцсети и мессенджеры
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          {socialEntries.map((entry) => (
                            <SocialIconLink key={entry.key} entry={entry} />
                          ))}
                          {messengerIconLinks.map((entry) => (
                            <MessengerIconLink
                              key={entry.key}
                              keyName={entry.key}
                              href={entry.href}
                              label={entry.label}
                            />
                          ))}
                        </div>
                      </section>
                    </>
                  )}

                  <Separator />

                  <section aria-label="Филиалы" className="space-y-3">
                    <h2 className="text-sm font-semibold">Филиалы</h2>
                    {branchRows.length > 0 ? (
                      <ul className="space-y-3">
                        {branchRows.map((branch) => (
                          <li
                            key={branch.id}
                            className="border-border rounded-lg border p-3"
                          >
                            <div className="flex items-start gap-2">
                              <MapPinIcon
                                className="text-muted-foreground mt-0.5 size-4 shrink-0"
                                aria-hidden
                              />
                              <div className="min-w-0 space-y-1 text-sm">
                                <p className="font-medium">
                                  {branch.label?.trim() || branch.city}
                                </p>
                                {branch.label?.trim() ? (
                                  <p className="text-muted-foreground">
                                    {branch.city}
                                  </p>
                                ) : null}
                                <p className="text-muted-foreground">
                                  {branch.address}
                                </p>
                                {branch.phone?.trim() ? (
                                  <a
                                    href={telHref(branch.phone)}
                                    className="hover:text-brand inline-flex items-center gap-1.5 transition-colors"
                                  >
                                    <PhoneIcon className="size-3.5" aria-hidden />
                                    {branch.phone.trim()}
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Адреса филиалов пока не указаны.
                      </p>
                    )}

                    <div
                      aria-hidden
                      className="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-lg border border-dashed text-center text-sm"
                    >
                      Интерактивная карта Яндекс
                    </div>
                  </section>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </WithSiteHeader>
  );
}
