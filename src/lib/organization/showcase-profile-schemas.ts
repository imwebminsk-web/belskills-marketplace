import { z } from "zod";

import {
  sanitizeOrganizationSlug,
  validateOrganizationSlug,
} from "@/lib/organization/showcase-profile";
import { normalizeRichTextHtml } from "@/lib/utils/rich-text-content";

type FormTextInput = string | null | undefined;

/** FormData: string | null | undefined → trimmed string or null if empty. */
function optionalFormTextField() {
  return z
    .string()
    .nullable()
    .optional()
    .transform((value: FormTextInput) => {
      if (value == null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    });
}

function optionalShortDescriptionField() {
  return optionalFormTextField().refine(
    (value) => value === null || value.length <= 150,
    "Краткое описание — не более 150 символов",
  );
}

function optionalRichTextField() {
  return z
    .string()
    .nullable()
    .optional()
    .transform((value: FormTextInput) => {
      if (value == null) {
        return null;
      }
      const normalized = normalizeRichTextHtml(value.trim());
      return normalized.length > 0 ? normalized : null;
    });
}

function galleryFormField() {
  return z
    .string()
    .nullable()
    .optional()
    .transform((value: FormTextInput) => {
      if (value == null) {
        return [] as string[];
      }

      return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    });
}

function phonesFormField() {
  return z
    .array(z.string().nullable().optional())
    .optional()
    .transform((values) => {
      if (!values) {
        return [] as string[];
      }

      return values
        .map((value) => String(value ?? "").trim())
        .filter((value) => value.length > 0);
    });
}

function requiredFormTextField(message = "Обязательное поле") {
  return z
    .string()
    .trim()
    .min(1, message);
}

const socialLinksFormSchema = z
  .object({
    instagram: optionalFormTextField(),
    facebook: optionalFormTextField(),
    vk: optionalFormTextField(),
    ok: optionalFormTextField(),
    linkedin: optionalFormTextField(),
    tiktok: optionalFormTextField(),
    x: optionalFormTextField(),
    youtube: optionalFormTextField(),
  })
  .transform((value) => {
    const result: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (typeof raw === "string" && raw.length > 0) {
        result[key] = raw;
      }
    }
    return result;
  });

export const updateMainProfileSchema = z.object({
  public_name: optionalFormTextField(),
  short_description: optionalShortDescriptionField(),
  long_description: optionalRichTextField(),
  cover_url: optionalFormTextField(),
  gallery: galleryFormField(),
  unp: requiredFormTextField(),
  legal_name: requiredFormTextField(),
  resubmit_to_moderation: z
    .string()
    .optional()
    .transform((value) => value === "1"),
});

export const updateContactsProfileSchema = z.object({
  website: optionalFormTextField(),
  phone_main: optionalFormTextField(),
  phones: phonesFormField(),
  social_links: socialLinksFormSchema,
  messenger_viber: optionalFormTextField(),
  messenger_telegram: optionalFormTextField(),
  messenger_whatsapp: optionalFormTextField(),
  resubmit_to_moderation: z
    .string()
    .optional()
    .transform((value) => value === "1"),
});

/** @deprecated Use updateMainProfileSchema / updateContactsProfileSchema */
export const updateOrganizationProfileSchema = updateMainProfileSchema.merge(
  updateContactsProfileSchema,
);

export const branchIdSchema = z.string().uuid("Некорректный ID филиала");

export const addBranchSchema = z.object({
  city: z.string().trim().min(1, "Укажите город"),
  address: z.string().trim().min(1, "Укажите адрес"),
  label: optionalFormTextField(),
  phone: optionalFormTextField(),
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
  .min(1, "Укажите адрес витрины")
  .transform(sanitizeOrganizationSlug)
  .superRefine((slug, ctx) => {
    const message = validateOrganizationSlug(slug);
    if (message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  });
