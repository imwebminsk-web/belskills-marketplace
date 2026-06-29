import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpenIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
} from "lucide-react";

import { WithSiteHeader } from "@/components/site/with-site-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  messengerContactHref,
  websiteContactHref,
} from "@/lib/organization/messenger-links";
import {
  isOrganizationSubscriptionActive,
  parseProfileMessengers,
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
  "id" | "city" | "address" | "label" | "created_at"
>;

type MessengerKey = "telegram" | "viber" | "whatsapp";

function decodeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

const contactLinkClassName =
  "hover:text-brand flex items-center gap-2 text-sm transition-colors";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("organization_profiles")
    .select("public_name, short_description, logo_url")
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(profile.logo_url ? { images: [{ url: profile.logo_url }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(profile.logo_url ? { images: [profile.logo_url] } : {}),
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
        *,
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
      .select("id, city, address, label, created_at")
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

  const longDescriptionHtml = profile.long_description
    ? normalizeRichTextHtml(profile.long_description)
    : "";

  const websiteHref = profile.website
    ? websiteContactHref(profile.website)
    : null;

  const messengerEntries: {
    key: MessengerKey;
    label: string;
    value: string;
    href: string | null;
  }[] = (
    [
      { key: "telegram" as const, label: "Telegram", value: messengers.telegram },
      { key: "viber" as const, label: "Viber", value: messengers.viber },
      { key: "whatsapp" as const, label: "WhatsApp", value: messengers.whatsapp },
    ] as const
  )
    .filter((entry) => entry.value.trim().length > 0)
    .map((entry) => ({
      ...entry,
      href: messengerContactHref(entry.key, entry.value),
    }));

  const hasContacts =
    Boolean(profile.phone_main?.trim()) ||
    Boolean(websiteHref) ||
    Boolean(profile.email?.trim()) ||
    messengerEntries.length > 0;

  return (
    <WithSiteHeader>
      <div className="bg-background min-h-screen">
        {isActive ? (
          <div className="border-brand/30 bg-brand/5 border-b">
            <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-2">
              <Badge variant="outline" className="border-brand text-brand">
                Предпросмотр
              </Badge>
            </div>
          </div>
        ) : null}

        <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
          <section
            aria-label="Учебный центр"
            className="flex flex-col gap-6 sm:flex-row sm:items-start"
          >
            <div className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
              {profile.logo_url ? (
                <Image
                  src={profile.logo_url}
                  alt={`Логотип ${profile.public_name}`}
                  width={96}
                  height={96}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-muted-foreground text-2xl font-semibold">
                  {profile.public_name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {profile.public_name}
              </h1>
              {profile.short_description ? (
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {profile.short_description}
                </p>
              ) : null}
            </div>
          </section>

          <Separator className="my-8" />

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

          <Separator className="my-8" />

          <section aria-label="Контакты" className="space-y-4">
            <h2 className="text-xl font-semibold">Контакты</h2>
            {hasContacts ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {profile.phone_main ? (
                  <a
                    href={`tel:${profile.phone_main.replace(/\s/g, "")}`}
                    className={contactLinkClassName}
                  >
                    <PhoneIcon className="size-4 shrink-0" aria-hidden />
                    <span>{profile.phone_main}</span>
                  </a>
                ) : null}
                {profile.email?.trim() ? (
                  <a
                    href={`mailto:${profile.email.trim()}`}
                    className={contactLinkClassName}
                  >
                    <MailIcon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{profile.email.trim()}</span>
                  </a>
                ) : null}
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={contactLinkClassName}
                  >
                    <GlobeIcon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{profile.website}</span>
                  </a>
                ) : null}
                {messengerEntries.map((entry) =>
                  entry.href ? (
                    <a
                      key={entry.key}
                      href={entry.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={contactLinkClassName}
                    >
                      <MessageCircleIcon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">
                        {entry.label}: {entry.value}
                      </span>
                    </a>
                  ) : (
                    <div
                      key={entry.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <MessageCircleIcon className="size-4 shrink-0" aria-hidden />
                      <span>
                        {entry.label}: {entry.value}
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Контактная информация пока не указана.
              </p>
            )}
          </section>

          <Separator className="my-8" />

          <section aria-label="Филиалы" className="space-y-4">
            <h2 className="text-xl font-semibold">Филиалы</h2>
            {branchRows.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {branchRows.map((branch) => (
                  <Card key={branch.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-start gap-2 text-base">
                        <MapPinIcon
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                          aria-hidden
                        />
                        <span>
                          {branch.label?.trim() || branch.city}
                        </span>
                      </CardTitle>
                      {branch.label?.trim() ? (
                        <CardDescription>{branch.city}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">
                      {branch.address}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Адреса филиалов пока не указаны.
              </p>
            )}
          </section>

          <Separator className="my-8" />

          <section aria-label="Курсы">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpenIcon className="size-5" aria-hidden />
                  Курсы
                </CardTitle>
                <CardDescription>
                  Здесь появится каталог курсов учебного центра.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Раздел в разработке. Скоро вы сможете публиковать курсы на
                  витрине школы.
                </p>
              </CardContent>
            </Card>
          </section>

          <div className="mt-8 text-center">
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
