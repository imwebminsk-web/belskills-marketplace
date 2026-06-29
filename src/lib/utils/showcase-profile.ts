export const RESERVED_SLUGS = [
  "dashboard",
  "settings",
  "auth",
  "admin",
  "api",
  "profile",
  "login",
  "register",
  "school",
] as const;

export type ReservedSlug = (typeof RESERVED_SLUGS)[number];

export const ORGANIZATION_SLUG_REGEX = /^[a-z0-9-]+$/;
export const ORGANIZATION_SLUG_MIN_LENGTH = 3;
export const ORGANIZATION_SLUG_MAX_LENGTH = 64;

const RESERVED_SLUG_SET = new Set<string>(RESERVED_SLUGS);

export function isReservedOrganizationSlug(slug: string): boolean {
  return RESERVED_SLUG_SET.has(slug);
}

export function sanitizeOrganizationSlug(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }

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

export function validateOrganizationSlug(slug: string): string | null {
  if (slug.length < ORGANIZATION_SLUG_MIN_LENGTH) {
    return `Адрес должен содержать минимум ${ORGANIZATION_SLUG_MIN_LENGTH} символа.`;
  }

  if (slug.length > ORGANIZATION_SLUG_MAX_LENGTH) {
    return `Адрес не длиннее ${ORGANIZATION_SLUG_MAX_LENGTH} символов.`;
  }

  if (!ORGANIZATION_SLUG_REGEX.test(slug)) {
    return "Только латинские буквы, цифры и дефисы (a-z, 0-9, -).";
  }

  if (slug.startsWith("-") || slug.endsWith("-")) {
    return "Адрес не может начинаться или заканчиваться дефисом.";
  }

  if (isReservedOrganizationSlug(slug)) {
    return "Этот адрес зарезервирован системой и недоступен.";
  }

  return null;
}
