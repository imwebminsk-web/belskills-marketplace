"use client";

import Image from "next/image";
import {
  Award,
  BookOpenIcon,
  Briefcase,
  Calendar,
  ChevronRight,
  GlobeIcon,
  MapIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { ShowcaseGallery } from "@/components/showcase/showcase-gallery";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  resolveSocialIconPath,
  type SocialLinkEntry,
} from "@/lib/organization/showcase-profile";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type BranchRow = Pick<
  Database["public"]["Tables"]["organization_branches"]["Row"],
  "id" | "city" | "address" | "label" | "phone"
>;

type MessengerKey = "telegram" | "viber" | "whatsapp";

type MessengerLink = {
  key: MessengerKey;
  href: string;
  label: string;
};

export type SchoolShowcaseTabsProps = {
  longDescriptionHtml: string;
  galleryUrls: string[];
  phoneList: string[];
  website: string | null;
  websiteHref: string | null;
  socialEntries: SocialLinkEntry[];
  messengerIconLinks: MessengerLink[];
  branchRows: BranchRow[];
};

/** Совпадает с `profileTabTriggerClass` в profile-form.tsx (Learning Center). */
const showcaseTabTriggerClass = cn(
  "h-9 min-h-9 flex-1 rounded-md px-3 py-2 text-sm font-normal",
  "bg-transparent text-muted-foreground",
  "hover:text-foreground",
  "focus-visible:ring-0 focus-visible:outline-none",
  "group-data-[variant=default]/tabs-list:data-active:!bg-brand/10",
  "group-data-[variant=default]/tabs-list:data-active:!text-brand",
  "group-data-[variant=default]/tabs-list:data-active:!shadow-none",
  "group-data-[variant=default]/tabs-list:data-active:font-medium",
  "group-data-[variant=default]/tabs-list:dark:data-active:!bg-brand/10",
  "group-data-[variant=default]/tabs-list:dark:data-active:!text-brand",
  "group-data-[variant=default]/tabs-list:dark:data-active:!border-transparent",
);

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
        width={24}
        height={24}
        className="size-6"
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
        width={24}
        height={24}
        className="size-6"
        aria-hidden
      />
    </a>
  );
}

const MOCK_COURSES = [
  {
    id: 1,
    category: "Иностранные языки",
    subcategory: "Английский",
    title: "Разговорный английский интенсив",
    description:
      "Погружение в языковую среду с носителями языка. Преодоление языкового барьера за 2 месяца.",
    badges: [
      {
        text: "Офлайн",
        classes:
          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
      },
      {
        text: "Для взрослых",
        classes:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
      },
      {
        text: "BelSkills",
        classes:
          "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      },
    ],
    price: { current: "450 BYN", old: "600 BYN" as string | null },
    hasEmployment: true,
    hasCertificate: true,
    startDate: "15 Сентября 2026",
  },
  {
    id: 2,
    category: "Красота и здоровье",
    subcategory: "Массаж",
    title: "Классический массаж тела",
    description:
      "Основы программирования, алгоритмы и создание первых проектов. Идеально для старта в IT.",
    badges: [
      {
        text: "Онлайн",
        classes:
          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
      },
      {
        text: "Для детей",
        classes:
          "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      },
      {
        text: "Демо уроки",
        classes:
          "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
      },
    ],
    price: { current: "300 BYN", old: null as string | null },
    hasEmployment: false,
    hasCertificate: true,
    startDate: null as string | null,
  },
  {
    id: 3,
    category: "Личные навыки",
    subcategory: "Психология",
    title: "Психология коммуникации",
    description:
      "Базовые понятия SMM, SEO и контекстной рекламы. Разбор реальных кейсов.",
    badges: [
      {
        text: "Онлайн",
        classes:
          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
      },
      {
        text: "Для взрослых",
        classes:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
      },
    ],
    price: { current: "Бесплатно", old: null as string | null },
    hasEmployment: false,
    hasCertificate: false,
    startDate: "1 Октября 2026",
  },
  {
    id: 4,
    category: "Бухгалтерия",
    subcategory: "1С: Бухгалтерия",
    title: "1С: Бухгалтерия 8.3 с нуля",
    description:
      "Проектирование удобных интерфейсов, работа в Figma, создание кликабельных прототипов.",
    badges: [
      {
        text: "Онлайн",
        classes:
          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
      },
      {
        text: "Для взрослых",
        classes:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
      },
    ],
    price: { current: "350 BYN", old: "450 BYN" as string | null },
    hasEmployment: true,
    hasCertificate: true,
    startDate: "20 Октября 2026",
  },
] as const;

function CourseCategoryBreadcrumbs({
  category,
  subcategory,
}: {
  category: string;
  subcategory: string;
}) {
  return (
    <div className="text-muted-foreground mb-1 flex items-center gap-1 text-xs font-medium">
      <span className="text-foreground/70">{category}</span>
      <ChevronRight className="size-3 opacity-50" aria-hidden />
      <span className="text-foreground/90">{subcategory}</span>
    </div>
  );
}

function CoursePriceBlock({
  current,
  old,
  size = "lg",
}: {
  current: string;
  old: string | null;
  size?: "lg" | "sm";
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={cn(
          "font-semibold tabular-nums text-green-600 dark:text-green-400",
          size === "lg" ? "text-lg" : "text-sm font-bold",
        )}
      >
        {current}
      </span>
      {old ? (
        <span className="text-muted-foreground text-xs tabular-nums line-through sm:text-sm">
          {old}
        </span>
      ) : null}
    </div>
  );
}

export function SchoolCoursesStub() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Курсы</h2>
      <ul className="space-y-4">
        {MOCK_COURSES.map((course) => (
          <li key={course.id}>
            <article className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-stretch">
              <div className="bg-muted relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg sm:aspect-auto sm:w-44 md:w-52 lg:w-56">
                <div className="text-muted-foreground flex size-full min-h-[120px] items-center justify-center">
                  <BookOpenIcon className="size-10 opacity-35" aria-hidden />
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-0.5">
                <CourseCategoryBreadcrumbs
                  category={course.category}
                  subcategory={course.subcategory}
                />
                <h3 className="text-lg leading-snug font-semibold tracking-tight">
                  {course.title}
                </h3>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                  {course.description}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {course.badges.map((badge) => (
                    <Badge
                      key={badge.text}
                      variant="secondary"
                      className={cn(
                        "rounded-md border-0 px-2.5 py-0.5 text-xs font-medium",
                        badge.classes,
                      )}
                    >
                      {badge.text}
                    </Badge>
                  ))}
                </div>
                <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-4 opacity-70" aria-hidden />
                    <span>
                      {course.startDate ? course.startDate : "По набору"}
                    </span>
                  </div>
                  {course.hasCertificate ? (
                    <div className="flex items-center gap-1.5">
                      <Award className="size-4 opacity-70" aria-hidden />
                      <span>Сертификат</span>
                    </div>
                  ) : null}
                  {course.hasEmployment ? (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="size-4 opacity-70" aria-hidden />
                      <span>Трудоустройство</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-border flex shrink-0 flex-col justify-center sm:border-l sm:pl-5">
                <CoursePriceBlock
                  current={course.price.current}
                  old={course.price.old}
                />
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-12 border-t border-dashed pt-8">
        <h3 className="mb-6 text-xl font-bold">
          Вариант 2: Вертикальные карточки (для каталога)
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {MOCK_COURSES.map((course) => (
            <div
              key={`${course.id}-v`}
              className="bg-card flex h-full flex-col overflow-hidden rounded-xl border transition-all hover:border-brand hover:shadow-md"
            >
              <div className="p-2 pb-0">
                <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg">
                  <div className="text-muted-foreground flex size-full items-center justify-center">
                    <BookOpenIcon className="size-12 opacity-35" aria-hidden />
                  </div>
                  <div className="absolute top-2 left-2 flex flex-col items-start gap-1.5">
                    {course.badges.map((badge) => (
                      <Badge
                        key={badge.text}
                        variant="secondary"
                        className={cn(
                          "rounded-md border-0 px-2.5 py-0.5 text-xs font-medium shadow-sm",
                          badge.classes,
                        )}
                      >
                        {badge.text}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <CourseCategoryBreadcrumbs
                  category={course.category}
                  subcategory={course.subcategory}
                />
                <h4 className="line-clamp-2 text-base leading-tight font-bold">
                  {course.title}
                </h4>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {course.description}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between border-t p-4 pt-3">
                <div className="flex items-center gap-2">
                  <div
                    className="size-6 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                    aria-hidden
                  />
                  <span className="text-muted-foreground text-xs font-semibold">
                    Белскилс
                  </span>
                </div>
                <CoursePriceBlock
                  current={course.price.current}
                  old={course.price.old}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewsTabStub() {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Отзывы</CardTitle>
        <CardDescription>
          Здесь будут отображаться отзывы учеников.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/40 text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm">
          Раздел в разработке
        </div>
      </CardContent>
    </Card>
  );
}

function YandexMapStub() {
  return (
    <div
      className="bg-muted text-muted-foreground flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
      role="img"
      aria-label="Заглушка карты Яндекс"
    >
      <MapIcon className="size-10 opacity-50" aria-hidden />
      <p className="text-sm font-medium">Яндекс Карта (Заглушка)</p>
    </div>
  );
}

export function SchoolShowcaseTabs({
  longDescriptionHtml,
  galleryUrls,
  phoneList,
  website,
  websiteHref,
  socialEntries,
  messengerIconLinks,
  branchRows,
}: SchoolShowcaseTabsProps) {
  return (
    <Tabs defaultValue="about" className="w-full">
      <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-transparent p-1">
        <TabsTrigger value="about" className={showcaseTabTriggerClass}>
          О центре
        </TabsTrigger>
        <TabsTrigger value="reviews" className={showcaseTabTriggerClass}>
          Отзывы
        </TabsTrigger>
        <TabsTrigger value="contacts" className={showcaseTabTriggerClass}>
          Контакты
        </TabsTrigger>
      </TabsList>

      <TabsContent value="about" className="mt-4 space-y-8">
        <section aria-label="О центре" className="space-y-4">
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
            <h2 className="text-lg font-semibold">Галерея</h2>
            <ShowcaseGallery urls={galleryUrls} />
          </section>
        ) : null}
      </TabsContent>

      <TabsContent value="reviews" className="mt-4">
        <ReviewsTabStub />
      </TabsContent>

      <TabsContent value="contacts" className="mt-4 space-y-8">
        {(phoneList.length > 0 || websiteHref) && (
          <section aria-label="Телефоны и сайт" className="space-y-3">
            <h2 className="text-lg font-semibold">Связаться с нами</h2>
            <div className="space-y-2">
              {phoneList.map((phone, phoneIndex) => (
                <a
                  key={`phone-${phoneIndex}-${phone}`}
                  href={telHref(phone)}
                  className="hover:text-brand flex items-center gap-2 text-sm transition-colors"
                >
                  <PhoneIcon className="size-4 shrink-0" aria-hidden />
                  <span>{phone}</span>
                </a>
              ))}
              {websiteHref && website ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand flex items-center gap-2 text-sm transition-colors"
                >
                  <GlobeIcon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{website}</span>
                </a>
              ) : null}
            </div>
          </section>
        )}

        {socialEntries.length > 0 && (
          <>
            <Separator />
            <section aria-label="Социальные сети" className="space-y-3">
              <h2 className="text-lg font-semibold">Социальные сети</h2>
              <div className="flex flex-wrap gap-2">
                {socialEntries.map((entry) => (
                  <SocialIconLink key={entry.key} entry={entry} />
                ))}
              </div>
            </section>
          </>
        )}

        {messengerIconLinks.length > 0 && (
          <>
            <Separator />
            <section aria-label="Мессенджеры" className="space-y-3">
              <h2 className="text-lg font-semibold">Мессенджеры</h2>
              <div className="flex flex-wrap gap-2">
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

        <section aria-label="Филиалы" className="space-y-4">
          <h2 className="text-lg font-semibold">Филиалы</h2>
          {branchRows.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {branchRows.map((branch) => (
                <li
                  key={branch.id}
                  className="border-border rounded-lg border p-4"
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
                        <p className="text-muted-foreground">{branch.city}</p>
                      ) : null}
                      <p className="text-muted-foreground">{branch.address}</p>
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

          <YandexMapStub />
        </section>
      </TabsContent>
    </Tabs>
  );
}
