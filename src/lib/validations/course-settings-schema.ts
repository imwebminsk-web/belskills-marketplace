import { z } from "zod";

export const DELIVERY_FORMAT_CODES = ["online", "offline", "hybrid"] as const;
export type DeliveryFormatCode = (typeof DELIVERY_FORMAT_CODES)[number];

export const MARKETING_AUDIENCE_CODES = ["kids", "adults"] as const;
export type MarketingAudienceCode = (typeof MARKETING_AUDIENCE_CODES)[number];

/** UI labels for legacy form controls (map to codes in server parsing). */
export const DELIVERY_FORMAT_LABELS = ["Онлайн", "Офлайн", "Гибрид"] as const;
export type DeliveryFormatLabel = (typeof DELIVERY_FORMAT_LABELS)[number];

export const DELIVERY_LABEL_TO_CODE: Record<DeliveryFormatLabel, DeliveryFormatCode> = {
  Онлайн: "online",
  Офлайн: "offline",
  Гибрид: "hybrid",
};

export const AUDIENCE_LABEL_TO_CODE: Record<string, MarketingAudienceCode> = {
  Дети: "kids",
  Взрослые: "adults",
  kids: "kids",
  adults: "adults",
};

export const AUDIENCE_CODE_TO_LABEL: Record<MarketingAudienceCode, string> = {
  kids: "Дети",
  adults: "Взрослые",
};

export const AUDIENCE_LABELS = ["Дети", "Взрослые"] as const;
export type AudienceLabel = (typeof AUDIENCE_LABELS)[number];

const durationUnitSchema = z.union([
  z.literal(""),
  z.enum(["hours", "weeks", "months"]),
]);

const optionalUrlSchema = z.union([
  z.literal(""),
  z.string().trim().url("Некорректный URL"),
]);

const nullableUuidSchema = z
  .union([z.literal(""), z.string().uuid()])
  .transform((value) => (value === "" ? null : value));

const courseBaseObject = z.object({
  title: z.string().trim().min(1, "Укажите название курса"),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  detailed_description: z.string().optional(),
  price: z.coerce.number().min(0, "Цена должна быть ≥ 0"),
  delivery_format: z.enum(DELIVERY_FORMAT_CODES, {
    message: "Выберите формат: online, offline или hybrid",
  }),
  marketing_audience: z.enum(MARKETING_AUDIENCE_CODES, {
    message: "Выберите аудиторию: kids или adults",
  }),
  category_id: z.string().uuid("Выберите категорию"),
  subcategory_id: nullableUuidSchema.optional(),
  marketing_tag_id: nullableUuidSchema.optional(),
  has_demo: z.boolean().default(false),
  is_belskills_partner: z.boolean().default(false),
  duration_value: z
    .union([z.literal(""), z.coerce.number().int().min(0)])
    .optional()
    .transform((value) =>
      value === "" || value === undefined ? null : value,
    ),
  duration_unit: durationUnitSchema.optional(),
  start_date: z.string().optional(),
  has_certificate: z.boolean().default(false),
  promotional_images: z.array(z.string().url()).max(24).default([]),
  youtube_url: optionalUrlSchema.optional(),
  vimeo_url: optionalUrlSchema.optional(),
});

export const courseCreateSchema = courseBaseObject;

export const courseUpdateSchema = courseBaseObject.extend({
  id: z.string().uuid("Некорректный идентификатор курса"),
  slug: z.string().trim().min(1, "URL курса не может быть пустым"),
});

export type CourseFormData = z.infer<typeof courseCreateSchema>;
export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;

/** @deprecated Use MARKETING_AUDIENCE_CODES in server actions. */
export const marketingAudienceFormSchema = z.union([
  z.literal(""),
  z.enum(["Дети", "Взрослые", "Все"]),
]);

/** @deprecated Use DELIVERY_FORMAT_CODES in server actions. */
export const deliveryFormatFormSchema = z.union([
  z.literal(""),
  z.enum(DELIVERY_FORMAT_LABELS),
]);
