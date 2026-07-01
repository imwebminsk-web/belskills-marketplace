"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import type { TaxonomyRow } from "@/app/actions/taxonomy-actions";
import {
  createCourse,
  updateCourse,
  uploadCourseGalleryImage,
  type CreateCourseState,
  type UpdateCourseState,
} from "@/app/actions/course-actions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Editor } from "@/components/ui/editor";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/utils/image-compression";
import { cn } from "@/lib/utils";
import {
  AUDIENCE_CODE_TO_LABEL,
  AUDIENCE_LABEL_TO_CODE,
  DELIVERY_FORMAT_CODES,
  DELIVERY_LABEL_TO_CODE,
  type DeliveryFormatLabel,
} from "@/lib/validations/course-settings-schema";
import type { Database } from "@/types/database.types";

import { CourseImageUpload } from "./course-image-upload";

export type CourseSettingsFormCourse = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "description"
  | "price"
  | "status"
  | "image_url"
  | "youtube_url"
  | "vimeo_url"
  | "detailed_description"
  | "promotional_images"
  | "marketing_audience"
  | "duration_value"
  | "duration_unit"
  | "start_date"
  | "has_certificate"
  | "delivery_format"
> & {
  category_id?: string | null;
  subcategory_id?: string | null;
  marketing_tag_id?: string | null;
  has_demo?: boolean;
  is_belskills_partner?: boolean;
};

const EMPTY_COURSE_SETTINGS: CourseSettingsFormCourse = {
  id: "",
  slug: "",
  title: "",
  description: "",
  detailed_description: "",
  price: 0,
  status: "draft",
  image_url: null,
  youtube_url: null,
  vimeo_url: null,
  category_id: null,
  subcategory_id: null,
  marketing_tag_id: null,
  has_demo: false,
  is_belskills_partner: false,
  marketing_audience: null,
  duration_value: null,
  duration_unit: null,
  start_date: null,
  has_certificate: false,
  delivery_format: null,
  promotional_images: [],
};

const initialState: CreateCourseState & UpdateCourseState = {};

const DELIVERY_CODE_TO_LABEL: Record<
  (typeof DELIVERY_FORMAT_CODES)[number],
  string
> = {
  online: "Онлайн",
  offline: "Офлайн",
  hybrid: "Гибрид",
};

/** Легаси-метки и коды → kids | adults для формы. */
function normalizeMarketingAudienceCode(
  raw: string | null | undefined,
): string {
  if (raw == null || !String(raw).trim()) return "";
  const v = String(raw).trim();
  if (v === "kids" || v === "adults") return v;
  return AUDIENCE_LABEL_TO_CODE[v] ?? "";
}

function normalizeDeliveryFormatCode(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return "";
  const v = String(raw).trim();
  if ((DELIVERY_FORMAT_CODES as readonly string[]).includes(v)) return v;
  if (v in DELIVERY_LABEL_TO_CODE) {
    return DELIVERY_LABEL_TO_CODE[v as DeliveryFormatLabel];
  }
  return "";
}

function CourseFormField({
  name,
  label,
  htmlFor,
  children,
  hint,
  error,
}: {
  name: string;
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
}) {
  return (
    <div className="grid gap-2" data-field={name}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {hint}
    </div>
  );
}

function isRootCategoryRow(t: TaxonomyRow): boolean {
  const type = typeof t.type === "string" ? t.type.trim() : "";
  const parentId = t.parent_id;
  return (
    type === "category" &&
    (parentId === null || parentId === undefined || parentId === "")
  );
}

function dateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function CourseSettingsForm({
  mode,
  course,
  taxonomies = [],
  organizationId,
  isPremium = false,
}: {
  mode: "create" | "edit";
  course?: CourseSettingsFormCourse;
  taxonomies?: TaxonomyRow[];
  organizationId?: string;
  isPremium?: boolean;
}) {
  const currentCourse = course ?? EMPTY_COURSE_SETTINGS;
  const isCreate = mode === "create";

  const rootCategories = (taxonomies || []).filter(isRootCategoryRow);

  const marketingTags = useMemo(
    () => taxonomies.filter((t) => t.type === "marketing_tag"),
    [taxonomies],
  );

  const [title, setTitle] = useState(currentCourse.title);
  const [slug, setSlug] = useState(currentCourse.slug);
  const [description, setDescription] = useState(currentCourse.description ?? "");
  const [price, setPrice] = useState(String(currentCourse.price ?? 0));
  const [marketingAudience, setMarketingAudience] = useState(() =>
    normalizeMarketingAudienceCode(currentCourse.marketing_audience),
  );
  const [deliveryFormat, setDeliveryFormat] = useState(
    normalizeDeliveryFormatCode(currentCourse.delivery_format),
  );
  const [durationUnit, setDurationUnit] = useState(
    currentCourse.duration_unit ?? "",
  );
  const [durationValue, setDurationValue] = useState(
    currentCourse.duration_value != null
      ? String(currentCourse.duration_value)
      : "",
  );
  const [startDate, setStartDate] = useState(
    dateInputValue(currentCourse.start_date),
  );
  const [youtubeUrl, setYoutubeUrl] = useState(currentCourse.youtube_url ?? "");
  const [vimeoUrl, setVimeoUrl] = useState(currentCourse.vimeo_url ?? "");
  const [hasCertificate, setHasCertificate] = useState(
    currentCourse.has_certificate,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    currentCourse.category_id ?? "",
  );
  const [subcategoryId, setSubcategoryId] = useState(
    currentCourse.subcategory_id ?? "",
  );
  const [marketingTagId, setMarketingTagId] = useState(
    currentCourse.marketing_tag_id ?? "",
  );
  const [hasDemo, setHasDemo] = useState(currentCourse.has_demo ?? false);
  const [isBelskillsPartner, setIsBelskillsPartner] = useState(
    currentCourse.is_belskills_partner ?? false,
  );
  const [detailedDescriptionHtml, setDetailedDescriptionHtml] = useState(
    currentCourse.detailed_description ?? "",
  );
  const [promotionalImages, setPromotionalImages] = useState<string[]>(() =>
    [...(currentCourse.promotional_images ?? [])].filter(
      (u) => typeof u === "string" && u.trim().length > 0,
    ),
  );

  const subcategories = useMemo(
    () =>
      taxonomies.filter(
        (t) =>
          t.type === "category" && t.parent_id === selectedCategoryId,
      ),
    [taxonomies, selectedCategoryId],
  );

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const formAction = isCreate ? createCourse : updateCourse;
  const [state, boundFormAction, isPending] = useActionState(
    formAction,
    initialState,
  );

  useEffect(() => {
    function clearRadixScrollLock() {
      for (const el of [document.body, document.documentElement]) {
        el.style.pointerEvents = "";
        el.style.overflow = "";
        el.style.paddingRight = "";
        el.removeAttribute("data-scroll-locked");
      }
    }
    clearRadixScrollLock();
    const t1 = window.setTimeout(clearRadixScrollLock, 0);
    const t2 = window.setTimeout(clearRadixScrollLock, 100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      clearRadixScrollLock();
    };
  }, []);

  async function onGalleryFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setGalleryBusy(true);
    try {
      let count = promotionalImages.length;
      for (const raw of files) {
        if (count >= 24) {
          toast.error("В галерее не более 24 изображений.");
          break;
        }
        try {
          const compressed = await compressImage(raw);
          if (compressed.size > 100 * 1024) {
            toast.error(
              `${raw.name}: после сжатия файл всё ещё больше 100 КБ.`,
            );
            continue;
          }
          const fd = new FormData();
          fd.append("file", compressed);
          const res = await uploadCourseGalleryImage(currentCourse.id, fd);
          if ("error" in res) {
            toast.error(res.error);
            continue;
          }
          setPromotionalImages((prev) => [...prev, res.url]);
          count += 1;
          toast.success("Изображение добавлено в галерею");
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Не удалось обработать файл.",
          );
        }
      }
    } finally {
      setGalleryBusy(false);
    }
  }

  useEffect(() => {
    setTitle(currentCourse.title);
    setSlug(currentCourse.slug);
    setDescription(currentCourse.description ?? "");
    setPrice(String(currentCourse.price ?? 0));
    setMarketingAudience(
      normalizeMarketingAudienceCode(currentCourse.marketing_audience),
    );
    setDeliveryFormat(
      normalizeDeliveryFormatCode(currentCourse.delivery_format),
    );
    setDurationUnit(currentCourse.duration_unit ?? "");
    setDurationValue(
      currentCourse.duration_value != null
        ? String(currentCourse.duration_value)
        : "",
    );
    setStartDate(dateInputValue(currentCourse.start_date));
    setYoutubeUrl(currentCourse.youtube_url ?? "");
    setVimeoUrl(currentCourse.vimeo_url ?? "");
    setHasCertificate(currentCourse.has_certificate);
    setSelectedCategoryId(currentCourse.category_id ?? "");
    setSubcategoryId(currentCourse.subcategory_id ?? "");
    setMarketingTagId(currentCourse.marketing_tag_id ?? "");
    setHasDemo(currentCourse.has_demo ?? false);
    setIsBelskillsPartner(currentCourse.is_belskills_partner ?? false);
    setDetailedDescriptionHtml(currentCourse.detailed_description ?? "");
    setPromotionalImages(
      [...(currentCourse.promotional_images ?? [])].filter(
        (u) => typeof u === "string" && u.trim().length > 0,
      ),
    );
  }, [currentCourse.id]);

  const fieldErrors = state.fieldErrors ?? {};
  const fieldErrorClass = (name: string) =>
    fieldErrors[name] ? "border-destructive focus-visible:ring-destructive/30" : "";

  const accordionDefaults = isCreate
    ? ["basic", "landing", "audience", "catalog", "schedule"]
    : ["basic", "media", "landing", "audience", "catalog", "schedule"];

  return (
    <Form action={boundFormAction} className="space-y-8">
      {!isCreate ? (
        <input type="hidden" name="id" value={currentCourse.id} />
      ) : null}
      {isCreate && organizationId ? (
        <input type="hidden" name="organizationId" value={organizationId} />
      ) : null}
      <input
        type="hidden"
        name="marketing_audience"
        value={marketingAudience || ""}
      />
      <input
        type="hidden"
        name="category_id"
        value={selectedCategoryId || ""}
      />
      <input
        type="hidden"
        name="subcategory_id"
        value={subcategoryId || ""}
      />
      <input
        type="hidden"
        name="marketing_tag_id"
        value={marketingTagId || ""}
      />
      <input type="hidden" name="has_demo" value={hasDemo ? "true" : "false"} />
      <input
        type="hidden"
        name="is_belskills_partner"
        value={isBelskillsPartner ? "true" : "false"}
      />
      <input type="hidden" name="duration_unit" value={durationUnit || ""} />
      <input
        type="hidden"
        name="delivery_format"
        value={deliveryFormat || ""}
      />
      <input
        type="hidden"
        name="has_certificate"
        value={hasCertificate ? "true" : "false"}
      />
      <input
        type="hidden"
        name="detailed_description"
        value={detailedDescriptionHtml}
      />
      <input
        type="hidden"
        name="promotional_images"
        value={JSON.stringify(promotionalImages)}
      />

      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Название и адрес курса</h3>
          <p className="text-muted-foreground text-sm">
            Заголовок курса и URL для страниц в личном кабинете и каталоге.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-edit-title">Название</Label>
            <Input
              id="course-edit-title"
              name="title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldErrorClass("title")}
              disabled={isPending}
            />
            {fieldErrors.title ? (
              <p className="text-destructive text-sm" role="alert">
                {fieldErrors.title}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL курса (slug)</Label>
            <Input
              id="slug"
              name="slug"
              required={!isCreate}
              maxLength={120}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={fieldErrorClass("slug")}
              disabled={isPending}
              placeholder="english-for-beginners"
            />
            {fieldErrors.slug ? (
              <p className="text-destructive text-sm" role="alert">
                {fieldErrors.slug}
              </p>
            ) : null}
            {isCreate ? (
              <p className="text-muted-foreground text-xs">
                Можно оставить пустым — адрес сгенерируется автоматически из
                названия.
              </p>
            ) : (
              <p className="text-xs text-destructive">
                Внимание: изменение URL сделает старые ссылки на курс
                недействительными.
              </p>
            )}
          </div>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={accordionDefaults}
        className="w-full"
      >
        <AccordionItem value="basic">
          <AccordionTrigger className="text-base font-medium">
            Основная информация
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Карточка курса</h3>
                <p className="text-muted-foreground text-sm">
                  Основная информация, цена и статус публикации.
                </p>
              </div>
              <div className="grid gap-4">
                <CourseFormField
                  name="category_id"
                  label="Категория"
                  htmlFor="course-edit-category"
                  error={fieldErrors.category_id}
                >
                  <Select
                    value={selectedCategoryId || undefined}
                    onValueChange={(val) => {
                      setSelectedCategoryId(val);
                      setSubcategoryId("");
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="course-edit-category"
                      className={cn("w-full", fieldErrorClass("category_id"))}
                    >
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200]">
                      {rootCategories.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Нет доступных вариантов
                        </SelectItem>
                      ) : (
                        rootCategories.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </CourseFormField>
                <CourseFormField
                  name="subcategory_id"
                  label="Подкатегория"
                  htmlFor="course-edit-subcategory"
                >
                  <Select
                    value={subcategoryId || undefined}
                    onValueChange={(val) => setSubcategoryId(val)}
                    disabled={isPending || !selectedCategoryId}
                  >
                    <SelectTrigger
                      id="course-edit-subcategory"
                      className="w-full"
                    >
                      <SelectValue placeholder="Не выбрано" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200]">
                      {subcategories.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Нет доступных вариантов
                        </SelectItem>
                      ) : (
                        subcategories.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </CourseFormField>
                <div className="grid gap-2">
                  <Label htmlFor="course-edit-description">
                    Краткое описание
                  </Label>
                  <Textarea
                    id="course-edit-description"
                    name="description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={fieldErrorClass("description")}
                    placeholder="Кратко о содержании курса"
                    disabled={isPending}
                  />
                  {fieldErrors.description ? (
                    <p className="text-destructive text-sm" role="alert">
                      {fieldErrors.description}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="course-edit-price">Цена</Label>
                  <Input
                    id="course-edit-price"
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={fieldErrorClass("price")}
                    disabled={isPending}
                  />
                  {fieldErrors.price ? (
                    <p className="text-destructive text-sm" role="alert">
                      {fieldErrors.price}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {!isCreate ? (
          <AccordionItem value="media">
            <AccordionTrigger className="text-base font-medium">
              Медиа
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-6">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    Медиа и внешние ссылки
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Обложка и ссылки на внешние площадки.
                  </p>
                </div>
                <CourseImageUpload
                  courseId={currentCourse.id}
                  initialImageUrl={currentCourse.image_url}
                />
                <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold">Внешние площадки</h4>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="course-youtube">Ссылка YouTube</Label>
                      <Input
                        id="course-youtube"
                        name="youtube_url"
                        type="url"
                        placeholder="https://www.youtube.com/…"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className={fieldErrorClass("youtube_url")}
                        disabled={isPending}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="course-vimeo">Ссылка Vimeo</Label>
                      <Input
                        id="course-vimeo"
                        name="vimeo_url"
                        type="url"
                        placeholder="https://vimeo.com/…"
                        value={vimeoUrl}
                        onChange={(e) => setVimeoUrl(e.target.value)}
                        className={fieldErrorClass("vimeo_url")}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : (
          <p className="text-muted-foreground text-sm">
            Загрузка медиафайлов будет доступна после создания курса.
          </p>
        )}

        <AccordionItem value="landing">
          <AccordionTrigger className="text-base font-medium">
            Лендинг
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Контент лендинга</h3>
                <p className="text-muted-foreground text-sm">
                  Текст страницы и галерея изображений.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-semibold">Подробное описание</h4>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="course-detailed">Текст для страницы курса</Label>
                  <Editor
                    id="course-detailed"
                    value={detailedDescriptionHtml}
                    onChange={setDetailedDescriptionHtml}
                    disabled={isPending}
                  />
                  <p className="text-muted-foreground text-xs">
                    Заголовки, списки и выделение сохраняются как HTML для
                    страницы курса.
                  </p>
                </div>
              </div>

              {!isCreate ? (
                <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold">Галерея лендинга</h4>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    До 24 изображений. Перед загрузкой файлы сжимаются в браузере
                    (цель до 100 КБ каждый), затем попадают в Storage. Сохраните
                    форму курса, чтобы записать список URL в базу.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="sr-only"
                      tabIndex={-1}
                      disabled={isPending || galleryBusy}
                      onChange={(ev) => void onGalleryFilesChange(ev)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        isPending || galleryBusy || promotionalImages.length >= 24
                      }
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      {galleryBusy ? (
                        <Loader2Icon
                          className="mr-2 size-4 animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <ImagePlusIcon className="mr-2 size-4" aria-hidden />
                      )}
                      Добавить изображения
                    </Button>
                    <span className="text-muted-foreground text-xs">
                      {promotionalImages.length} / 24
                    </span>
                  </div>
                  {promotionalImages.length > 0 ? (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {promotionalImages.map((url) => (
                        <li
                          key={url}
                          className="border-border group relative aspect-square overflow-hidden rounded-lg border bg-muted/30"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="size-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon-xs"
                            className="absolute right-1 top-1 size-7 opacity-90 shadow-sm"
                            disabled={isPending || galleryBusy}
                            aria-label="Убрать из галереи"
                            onClick={() =>
                              setPromotionalImages((prev) =>
                                prev.filter((u) => u !== url),
                              )
                            }
                          >
                            <XIcon className="size-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground border-border rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                      Пока нет изображений — добавьте через кнопку выше.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="audience">
          <AccordionTrigger className="text-base font-medium">
            Целевая аудитория
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Целевая аудитория</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <CourseFormField
                  name="marketing_audience"
                  label="Аудитория (лендинг)"
                  htmlFor="course-audience"
                  error={fieldErrors.marketing_audience}
                >
                  <Select
                    value={marketingAudience || undefined}
                    onValueChange={(val) => setMarketingAudience(val)}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="course-audience"
                      className={cn("w-full", fieldErrorClass("marketing_audience"))}
                    >
                      <SelectValue placeholder="Не выбрано" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200]">
                      <SelectItem value="kids">
                        {AUDIENCE_CODE_TO_LABEL.kids}
                      </SelectItem>
                      <SelectItem value="adults">
                        {AUDIENCE_CODE_TO_LABEL.adults}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CourseFormField>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="catalog">
          <AccordionTrigger className="text-base font-medium">
            Витрина и каталог
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Витрина и каталог</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <CourseFormField
                  name="delivery_format"
                  label="Формат проведения"
                  htmlFor="course-delivery-format"
                  error={fieldErrors.delivery_format}
                >
                  <Select
                    value={deliveryFormat || undefined}
                    onValueChange={(val) => setDeliveryFormat(val)}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="course-delivery-format"
                      className={cn("w-full", fieldErrorClass("delivery_format"))}
                    >
                      <SelectValue placeholder="Не выбрано" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200]">
                      <SelectItem value="online">
                        {DELIVERY_CODE_TO_LABEL.online}
                      </SelectItem>
                      <SelectItem value="offline">
                        {DELIVERY_CODE_TO_LABEL.offline}
                      </SelectItem>
                      <SelectItem value="hybrid">
                        {DELIVERY_CODE_TO_LABEL.hybrid}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CourseFormField>
                <CourseFormField
                  name="marketing_tag_id"
                  label="Маркетинговый тег"
                  htmlFor="course-marketing-tag"
                  hint={
                    !isPremium ? (
                      <p className="text-muted-foreground text-xs">
                        Доступно на тарифе Premium
                      </p>
                    ) : null
                  }
                >
                  <Select
                    value={marketingTagId || undefined}
                    onValueChange={(val) => setMarketingTagId(val)}
                    disabled={isPending || !isPremium}
                  >
                    <SelectTrigger id="course-marketing-tag" className="w-full">
                      <SelectValue placeholder="Не выбрано" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200]">
                      {marketingTags.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CourseFormField>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox
                    id="course-has-demo"
                    checked={hasDemo}
                    onCheckedChange={(v) => setHasDemo(v === true)}
                    disabled={isPending}
                  />
                  <Label
                    htmlFor="course-has-demo"
                    className="cursor-pointer font-normal"
                  >
                    Демо-урок
                  </Label>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox
                    id="course-belskills-partner"
                    checked={isBelskillsPartner}
                    onCheckedChange={(v) => setIsBelskillsPartner(v === true)}
                    disabled={isPending}
                  />
                  <Label
                    htmlFor="course-belskills-partner"
                    className="cursor-pointer font-normal"
                  >
                    BelSkills
                  </Label>
                </div>
                <p className="text-muted-foreground text-xs md:col-span-2">
                  Эти поля используются на главной странице для фильтров каталога.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="schedule">
          <AccordionTrigger className="text-base font-medium">
            Расписание и длительность
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Расписание и длительность</h3>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="course-duration-value">Длительность (число)</Label>
                    <Input
                      id="course-duration-value"
                      name="duration_value"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Например, 8"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="course-duration-unit">Единица</Label>
                    <Select
                      value={durationUnit || "__empty__"}
                      onValueChange={(v) =>
                        setDurationUnit(v === "__empty__" ? "" : v)
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="course-duration-unit"
                        className="w-full"
                      >
                        <SelectValue placeholder="Не выбрано" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[200]">
                        <SelectItem value="__empty__">Не выбрано</SelectItem>
                        <SelectItem value="hours">Часов</SelectItem>
                        <SelectItem value="weeks">Недель</SelectItem>
                        <SelectItem value="months">Месяцев</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="course-start-date">Дата старта</Label>
                  <Input
                    id="course-start-date"
                    name="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isPending}
                  />
                  <p className="text-muted-foreground text-xs">
                    Оставьте пустым, если дата не фиксирована.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="course-certificate"
                    checked={hasCertificate}
                    onCheckedChange={(v) => setHasCertificate(v === true)}
                    disabled={isPending}
                  />
                  <Label
                    htmlFor="course-certificate"
                    className="cursor-pointer font-normal"
                  >
                    Выдаётся сертификат
                  </Label>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {!isCreate && state.success ? (
        <p className="text-muted-foreground text-sm" role="status">
          {state.message ?? "Изменения сохранены."}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isCreate
              ? "Создание…"
              : "Сохранение…"
            : isCreate
              ? "Создать курс"
              : "Сохранить изменения"}
        </Button>
      </div>
    </Form>
  );
}
