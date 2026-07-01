"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  canAccessOrganization,
  canManageCourse,
  hasStaffAccess,
  isGlobalAdmin,
  loadAuthContext,
} from "@/lib/auth/access";
import { parseCourseStatus } from "@/lib/course/course-status";
import { createClient } from "@/lib/supabase/server";
import {
  AUDIENCE_LABEL_TO_CODE,
  courseCreateSchema,
  courseUpdateSchema,
  DELIVERY_LABEL_TO_CODE,
  DELIVERY_FORMAT_CODES,
  type DeliveryFormatLabel,
  type MarketingAudienceCode,
} from "@/lib/validations/course-settings-schema";
import type { Database } from "@/types/database.types";

export type CreateCourseState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type UpdateCourseState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Простая транслитерация русских букв в латиницу (для читаемых ASCII-slug).
 * Ъ/Ь опускаются; ё → yo; ж/х/ц/ч/ш/щ → digraph.
 */
function transliterate(text: string): string {
  const map: Record<string, string> = {
    А: "a",
    а: "a",
    Б: "b",
    б: "b",
    В: "v",
    в: "v",
    Г: "g",
    г: "g",
    Д: "d",
    д: "d",
    Е: "e",
    е: "e",
    Ё: "yo",
    ё: "yo",
    Ж: "zh",
    ж: "zh",
    З: "z",
    з: "z",
    И: "i",
    и: "i",
    Й: "y",
    й: "y",
    К: "k",
    к: "k",
    Л: "l",
    л: "l",
    М: "m",
    м: "m",
    Н: "n",
    н: "n",
    О: "o",
    о: "o",
    П: "p",
    п: "p",
    Р: "r",
    р: "r",
    С: "s",
    с: "s",
    Т: "t",
    т: "t",
    У: "u",
    у: "u",
    Ф: "f",
    ф: "f",
    Х: "h",
    х: "h",
    Ц: "ts",
    ц: "ts",
    Ч: "ch",
    ч: "ch",
    Ш: "sh",
    ш: "sh",
    Щ: "shch",
    щ: "shch",
    Ъ: "",
    ъ: "",
    Ы: "y",
    ы: "y",
    Ь: "",
    ь: "",
    Э: "e",
    э: "e",
    Ю: "yu",
    ю: "yu",
    Я: "ya",
    я: "ya",
    І: "i",
    і: "i",
    Ї: "yi",
    ї: "yi",
    Є: "ye",
    є: "ye",
    Ґ: "g",
    ґ: "g",
  };

  let out = "";
  for (const ch of text) {
    out += map[ch] ?? ch;
  }
  return out;
}

/** Slug: транслит → нижний регистр, пробелы → дефисы, только буквы/цифры (латиница после транслита). */
function baseSlugFromTitle(title: string): string {
  const transliterated = transliterate(title.trim());
  const normalized = transliterated
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "");
  const replaced = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return replaced || "course";
}

/** Нормализация slug из ручного ввода: lowercase, только a-z, 0-9 и дефисы. */
function sanitizeSlug(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "");
  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBooleanFormValue(formData: FormData, name: string): boolean {
  return String(formData.get(name) ?? "").trim() === "true";
}

function normalizeDeliveryFormat(raw: string): string {
  const trimmed = raw.trim();
  if ((DELIVERY_FORMAT_CODES as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  if (trimmed in DELIVERY_LABEL_TO_CODE) {
    return DELIVERY_LABEL_TO_CODE[trimmed as DeliveryFormatLabel];
  }
  return trimmed;
}

function normalizeMarketingAudience(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed in AUDIENCE_LABEL_TO_CODE) {
    return AUDIENCE_LABEL_TO_CODE[trimmed];
  }
  return trimmed;
}

function parsePromotionalImages(
  raw: string,
): { images: string[] } | { error: string } {
  if (!raw.trim()) {
    return { images: [] };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { error: "Некорректный формат галереи (ожидается массив URL)." };
    }
    const urls = parsed.filter(
      (x): x is string =>
        typeof x === "string" &&
        x.trim().length > 0 &&
        /^https?:\/\//i.test(x.trim()),
    );
    if (urls.length > 24) {
      return { error: "В галерее не более 24 изображений." };
    }
    return { images: [...new Set(urls.map((u) => u.trim()))] };
  } catch {
    return { error: "Некорректный JSON галереи изображений." };
  }
}

/** Извлекает поля формы курса в объект для Zod-валидации. */
function parseCourseFormData(formData: FormData) {
  const promotionalImagesRaw = String(
    formData.get("promotional_images") ?? "",
  ).trim();
  const galleryParsed = parsePromotionalImages(promotionalImagesRaw);
  const promotional_images =
    "error" in galleryParsed ? [] : galleryParsed.images;
  const promotionalImagesError =
    "error" in galleryParsed ? galleryParsed.error : null;

  return {
    meta: {
      organizationId:
        String(formData.get("organizationId") ?? "").trim() || undefined,
      promotionalImagesError,
    },
    raw: {
      id: String(formData.get("id") ?? "").trim() || undefined,
      title: String(formData.get("title") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim(),
      detailed_description: String(
        formData.get("detailed_description") ?? "",
      ).trim(),
      price: String(formData.get("price") ?? "").trim(),
      delivery_format: normalizeDeliveryFormat(
        String(formData.get("delivery_format") ?? ""),
      ),
      marketing_audience: normalizeMarketingAudience(
        String(formData.get("marketing_audience") ?? ""),
      ),
      category_id: String(formData.get("category_id") ?? "").trim(),
      subcategory_id: String(formData.get("subcategory_id") ?? "").trim(),
      marketing_tag_id: String(formData.get("marketing_tag_id") ?? "").trim(),
      has_demo: parseBooleanFormValue(formData, "has_demo"),
      is_belskills_partner: parseBooleanFormValue(
        formData,
        "is_belskills_partner",
      ),
      duration_value: String(formData.get("duration_value") ?? "").trim(),
      duration_unit: String(formData.get("duration_unit") ?? "").trim(),
      start_date: String(formData.get("start_date") ?? "").trim(),
      has_certificate: parseBooleanFormValue(formData, "has_certificate"),
      promotional_images,
      youtube_url: String(formData.get("youtube_url") ?? "").trim(),
      vimeo_url: String(formData.get("vimeo_url") ?? "").trim(),
    },
  };
}

async function resolveUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  rawSlug?: string,
): Promise<{ slug: string } | { error: string }> {
  const base =
    rawSlug && rawSlug.length > 0
      ? sanitizeSlug(rawSlug) || baseSlugFromTitle(title)
      : baseSlugFromTitle(title);

  if (!base) {
    return { error: "URL курса не может быть пустым." };
  }

  let slug = base;
  let suffix = 0;
  const maxAttempts = 50;

  while (suffix < maxAttempts) {
    const candidate = suffix === 0 ? slug : `${base}-${suffix}`;
    const { data: row } = await supabase
      .from("courses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!row) {
      return { slug: candidate };
    }
    suffix += 1;
  }

  return { error: "Не удалось подобрать уникальный адрес (slug) для курса." };
}

type CourseStatus = Database["public"]["Enums"]["course_status"];
type TargetAudience = Database["public"]["Enums"]["target_audience"];

type CourseCatalogWriteFields = {
  title: string;
  description: string | null;
  detailed_description: string | null;
  price: number;
  status: CourseStatus;
  delivery_format: string;
  marketing_audience: MarketingAudienceCode;
  target_audience: TargetAudience;
  category_id: string;
  subcategory_id: string | null;
  marketing_tag_id: string | null;
  has_demo: boolean;
  is_belskills_partner: boolean;
  duration_value: number | null;
  duration_unit: string | null;
  start_date: string | null;
  has_certificate: boolean;
  promotional_images: string[];
  youtube_url: string | null;
  vimeo_url: string | null;
};

function buildCourseCatalogFields(
  data: z.infer<typeof courseCreateSchema>,
  status: CourseStatus,
): CourseCatalogWriteFields {
  let start_date: string | null = null;
  if (data.start_date?.trim()) {
    const d = new Date(`${data.start_date}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) {
      start_date = d.toISOString();
    }
  }

  return {
    title: data.title,
    description: data.description?.trim() ? data.description.trim() : null,
    detailed_description: data.detailed_description?.trim()
      ? data.detailed_description.trim()
      : null,
    price: data.price,
    status,
    delivery_format: data.delivery_format,
    marketing_audience: data.marketing_audience,
    target_audience: data.marketing_audience === "kids" ? "kids" : "adults",
    category_id: data.category_id,
    subcategory_id: data.subcategory_id ?? null,
    marketing_tag_id: data.marketing_tag_id ?? null,
    has_demo: data.has_demo,
    is_belskills_partner: data.is_belskills_partner,
    duration_value: data.duration_value ?? null,
    duration_unit: data.duration_unit ?? null,
    start_date,
    has_certificate: data.has_certificate,
    promotional_images: data.promotional_images,
    youtube_url:
      data.youtube_url && data.youtube_url !== "" ? data.youtube_url : null,
    vimeo_url: data.vimeo_url && data.vimeo_url !== "" ? data.vimeo_url : null,
  };
}

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

function zodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Некорректные данные формы.";
}

function validationErrorState(error: z.ZodError): CreateCourseState {
  return {
    error: zodErrorMessage(error),
    fieldErrors: zodFieldErrors(error),
  };
}

export async function createCourse(
  _prev: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  const { meta, raw } = parseCourseFormData(formData);

  if (meta.promotionalImagesError) {
    return { error: meta.promotionalImagesError };
  }

  const parsed = courseCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  const data = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Нужна авторизация." };
  }

  const { profile, tenants, primaryTenant } = await loadAuthContext(user.id);

  if (!profile) {
    return { error: "Профиль не найден." };
  }

  if (!hasStaffAccess(profile, tenants)) {
    return {
      error: "Создавать курсы могут только сотрудники организации или администраторы.",
    };
  }

  const organizationId =
    meta.organizationId ?? primaryTenant?.organizationId ?? null;

  if (!organizationId) {
    return { error: "Не указана организация для курса." };
  }

  if (!canAccessOrganization(profile, tenants, organizationId)) {
    return { error: "Нет доступа к этой организации." };
  }

  const slugResult = await resolveUniqueSlug(supabase, data.title, data.slug);
  if ("error" in slugResult) {
    return { error: slugResult.error };
  }

  const catalogFields = buildCourseCatalogFields(data, "draft");

  const { data: inserted, error: insertError } = await supabase
    .from("courses")
    .insert({
      ...catalogFields,
      slug: slugResult.slug,
      organization_id: organizationId,
    })
    .select("slug")
    .single();

  if (insertError || !inserted) {
    console.error("[createCourse]", insertError?.message);
    return {
      error: insertError?.message || "Не удалось сохранить курс.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  redirect(`/dashboard/courses/${inserted.slug}`);
}

export async function updateCourse(
  _prev: UpdateCourseState,
  formData: FormData,
): Promise<UpdateCourseState> {
  const { meta, raw } = parseCourseFormData(formData);

  if (meta.promotionalImagesError) {
    return { error: meta.promotionalImagesError };
  }

  const parsed = courseUpdateSchema.safeParse({
    ...raw,
    slug: raw.slug ? sanitizeSlug(raw.slug) : raw.slug,
  });

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  const data = parsed.data;
  const newSlug = sanitizeSlug(data.slug ?? "");
  if (!newSlug) {
    return { error: "URL курса не может быть пустым." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Нужна авторизация." };
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { error: "Профиль не найден." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("courses")
    .select("id, organization_id, slug, status")
    .eq("id", data.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Курс не найден." };
  }

  if (!canManageCourse(profile, tenants, existing)) {
    return { error: "Нет прав на изменение этого курса." };
  }

  const slugChanged = newSlug !== existing.slug;

  if (slugChanged) {
    const { data: taken } = await supabase
      .from("courses")
      .select("id")
      .eq("slug", newSlug)
      .maybeSingle();

    if (taken) {
      return { error: "Этот URL уже занят другим курсом." };
    }
  }

  const catalogFields = buildCourseCatalogFields(
    data,
    parseCourseStatus(existing.status),
  );

  const { error: updateError } = await supabase
    .from("courses")
    .update({
      ...catalogFields,
      slug: newSlug,
    })
    .eq("id", data.id);

  if (updateError) {
    console.error("[updateCourse]", updateError.message);
    return {
      error: updateError.message || "Не удалось сохранить изменения.",
    };
  }

  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${existing.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath(`/courses/${encodeURIComponent(existing.slug)}`);

  if (slugChanged) {
    revalidatePath(`/dashboard/courses/${newSlug}`);
    revalidatePath(`/courses/${encodeURIComponent(newSlug)}`);
  }

  return { success: true, message: "Курс успешно обновлен" };
}

type CourseModerationActionResult =
  | { success: true }
  | { success: false; error: string };

function revalidateTeacherCoursePaths(slug: string) {
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${slug}`);
  revalidatePath("/dashboard/admin/courses");
  revalidatePath("/");
  revalidatePath(`/courses/${encodeURIComponent(slug)}`);
}

async function requireCourseManager(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "Нужна авторизация." };
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { success: false as const, error: "Профиль не найден." };
  }

  const { data: course, error: fetchError } = await supabase
    .from("courses")
    .select("id, organization_id, slug, status, rejection_reason")
    .eq("id", courseId)
    .maybeSingle();

  if (fetchError) {
    console.error("[requireCourseManager] fetch", fetchError.message);
    return { success: false as const, error: fetchError.message };
  }

  if (!course) {
    return { success: false as const, error: "Курс не найден." };
  }

  if (!canManageCourse(profile, tenants, course)) {
    return { success: false as const, error: "Нет прав на изменение этого курса." };
  }

  return { success: true as const, supabase, profile, course };
}

/** Преподаватель отправляет курс на проверку администратором. */
export async function submitCourseForModeration(
  courseId: string,
): Promise<CourseModerationActionResult> {
  const auth = await requireCourseManager(courseId);
  if (!auth.success) {
    return auth;
  }

  if (isGlobalAdmin(auth.profile)) {
    return {
      success: false,
      error: "Глобальный администратор публикует курсы через панель модерации.",
    };
  }

  const currentStatus = parseCourseStatus(auth.course.status);

  if (currentStatus === "moderation") {
    return { success: false, error: "Курс уже на модерации." };
  }

  if (currentStatus === "published") {
    return { success: false, error: "Курс уже опубликован." };
  }

  if (
    currentStatus !== "draft" &&
    currentStatus !== "hidden" &&
    currentStatus !== "rejected"
  ) {
    return {
      success: false,
      error: "Курс нельзя отправить на модерацию в текущем статусе.",
    };
  }

  const { error: updateError } = await auth.supabase
    .from("courses")
    .update({
      status: "moderation",
      rejection_reason: null,
    })
    .eq("id", auth.course.id);

  if (updateError) {
    console.error("[submitCourseForModeration]", updateError.message);
    return { success: false, error: "Не удалось отправить курс на модерацию." };
  }

  revalidateTeacherCoursePaths(auth.course.slug);
  return { success: true };
}

/** Преподаватель снимает опубликованный курс с публикации (скрывает). */
export async function unpublishCourseForTeacher(
  courseId: string,
): Promise<CourseModerationActionResult> {
  const auth = await requireCourseManager(courseId);
  if (!auth.success) {
    return auth;
  }

  if (isGlobalAdmin(auth.profile)) {
    return {
      success: false,
      error: "Используйте панель модерации курсов для управления публикацией.",
    };
  }

  const currentStatus = parseCourseStatus(auth.course.status);

  if (currentStatus !== "published") {
    return {
      success: false,
      error: "Снять с публикации можно только опубликованный курс.",
    };
  }

  const { error: updateError } = await auth.supabase
    .from("courses")
    .update({
      status: "hidden",
      rejection_reason: null,
    })
    .eq("id", auth.course.id);

  if (updateError) {
    console.error("[unpublishCourseForTeacher]", updateError.message);
    return { success: false, error: "Не удалось снять курс с публикации." };
  }

  revalidateTeacherCoursePaths(auth.course.slug);
  return { success: true };
}

/** Серверный потолок после клиентского сжатия (~100 КБ); допускаем запас. */
const GALLERY_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

function galleryExtFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export type UploadCourseGalleryImageResult =
  | { url: string; error?: undefined }
  | { url?: undefined; error: string };

/** Загрузка одного сжатого кадра галереи в `course-covers` (путь: `{uid}/gallery/{courseId}/…`). */
export async function uploadCourseGalleryImage(
  courseId: string,
  formData: FormData,
): Promise<UploadCourseGalleryImageResult> {
  const cid = courseId.trim();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Файл не передан." };
  }
  if (file.size === 0) {
    return { error: "Пустой файл." };
  }
  if (file.size > GALLERY_UPLOAD_MAX_BYTES) {
    return {
      error: "Файл слишком большой (макс. 2 МБ). Сожмите изображение на клиенте.",
    };
  }

  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);
  if (!allowed.has(file.type)) {
    return { error: "Допустимы только JPEG, PNG, WebP или GIF." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Нужна авторизация." };
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { error: "Профиль не найден." };
  }

  const { data: row, error: fetchError } = await supabase
    .from("courses")
    .select("id, organization_id")
    .eq("id", cid)
    .maybeSingle();

  if (fetchError || !row || !canManageCourse(profile, tenants, row)) {
    return { error: "Курс не найден или нет прав на загрузку." };
  }

  const ext = galleryExtFromMime(file.type);
  const objectPath = `${user.id}/gallery/${cid}/${randomUUID()}.${ext}`;
  const body = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("course-covers")
    .upload(objectPath, body, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message || "Ошибка загрузки в Storage." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("course-covers").getPublicUrl(objectPath);

  return { url: publicUrl };
}

export type UpdateCourseImageState = {
  success?: boolean;
  error?: string;
};

/** Обновляет только `image_url` (обложка из Storage). */
export async function updateCourseImage(
  courseId: string,
  imageUrl: string,
): Promise<UpdateCourseImageState> {
  const id = courseId.trim();
  const url = imageUrl.trim();

  if (!id) {
    return { error: "Не указан курс." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Нужна авторизация." };
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { error: "Профиль не найден." };
  }

  const { data: course, error: fetchError } = await supabase
    .from("courses")
    .select("id, organization_id, slug")
    .eq("id", id)
    .maybeSingle();

  if (
    fetchError ||
    !course ||
    !canManageCourse(profile, tenants, course)
  ) {
    return { error: "Курс не найден или нет прав." };
  }

  const { error: updateError } = await supabase
    .from("courses")
    .update({ image_url: url.length > 0 ? url : null })
    .eq("id", id);

  if (updateError) {
    console.error("[updateCourseImage]", updateError.message);
    return { error: updateError.message || "Не удалось сохранить обложку." };
  }

  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${course.slug}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export type UpdateCourseVideoState = {
  success?: boolean;
  error?: string;
};

/** Обновляет только `video_url` (self-hosted видео из Storage). */
export async function updateCourseVideo(
  courseId: string,
  videoUrl: string,
): Promise<UpdateCourseVideoState> {
  const id = courseId.trim();
  const url = videoUrl.trim();

  if (!id) {
    return { error: "Не указан курс." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Нужна авторизация." };
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { error: "Профиль не найден." };
  }

  const { data: course, error: fetchError } = await supabase
    .from("courses")
    .select("id, organization_id, slug")
    .eq("id", id)
    .maybeSingle();

  if (
    fetchError ||
    !course ||
    !canManageCourse(profile, tenants, course)
  ) {
    return { error: "Курс не найден или нет прав." };
  }

  const { error: updateError } = await supabase
    .from("courses")
    .update({ video_url: url.length > 0 ? url : null })
    .eq("id", id);

  if (updateError) {
    console.error("[updateCourseVideo]", updateError.message);
    return { error: updateError.message || "Не удалось сохранить видео." };
  }

  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${course.slug}`);
  revalidatePath("/dashboard");
  return { success: true };
}
