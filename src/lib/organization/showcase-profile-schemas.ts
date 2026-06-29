import { z } from "zod";

import {
  sanitizeOrganizationSlug,
  validateOrganizationSlug,
} from "@/lib/organization/showcase-profile";
import { normalizeRichTextHtml } from "@/lib/utils/rich-text-content";

const optionalFormText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const phonesFormSchema = z
  .array(z.union([z.string(), z.null()]))
  .optional()
  .transform((values) => {
    if (!values) {
      return [] as string[];
    }

    return values
      .map((value) => String(value ?? "").trim())
      .filter((value) => value.length > 0);
  });

const galleryFormSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === undefined) {
      return [] as string[];
    }

    return String(value)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  });

const socialLinksFormSchema = z
  .record(z.string(), z.union([z.string(), z.null()]))
  .optional()
  .transform((value) => {
    if (!value) {
      return {} as Record<string, string>;
    }

    const result: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value)) {
      const trimmed = String(raw ?? "").trim();
      if (trimmed.length > 0) {
        result[key] = trimmed;
      }
    }
    return result;
  });

const optionalRichText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const normalized = normalizeRichTextHtml(String(value ?? "").trim());
    return normalized.length > 0 ? normalized : null;
  });

export const updateOrganizationProfileSchema = z.object({
  public_name: z
    .string()
    .trim()
    .min(1, "Укажите неофициальное название (бренд)"),
  short_description: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null || value === undefined) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine(
      (value) => value === null || value.length <= 150,
      "Краткое описание — не более 150 символов",
    ),
  long_description: optionalRichText,
  cover_url: optionalFormText,
  gallery: galleryFormSchema,
  unp: optionalFormText,
  legal_name: optionalFormText,
  phones: phonesFormSchema,
  social_links: socialLinksFormSchema,
  website: optionalFormText,
  phone_main: optionalFormText,
  messenger_viber: optionalFormText,
  messenger_telegram: optionalFormText,
  messenger_whatsapp: optionalFormText,
});

export const branchIdSchema = z.string().uuid("Некорректный ID филиала");

export const addBranchSchema = z.object({
  city: z.string().trim().min(1, "Укажите город"),
  address: z.string().trim().min(1, "Укажите адрес"),
  label: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  phone: optionalFormText,
});

export const organizationLogoPathSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d+\.webp$/,
    "Некорректный путь к файлу логотипа",
  );

export const organizationSlugSchema = z
  .string()
  .trim()
  .transform(sanitizeOrganizationSlug)
  .superRefine((slug, ctx) => {
    const message = validateOrganizationSlug(slug);
    if (message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  });
