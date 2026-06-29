import type { Json } from "@/types/database.types";

export {
  ORGANIZATION_SLUG_MAX_LENGTH,
  ORGANIZATION_SLUG_MIN_LENGTH,
  ORGANIZATION_SLUG_REGEX,
  RESERVED_SLUGS,
  isReservedOrganizationSlug,
  sanitizeOrganizationSlug,
  validateOrganizationSlug,
} from "@/lib/utils/showcase-profile";

export const SHORT_DESCRIPTION_MAX = 150;

/** Публичное брендовое имя с запасным системным названием организации. */
export function resolveOrganizationBrandName(
  publicName: string | null | undefined,
  systemName: string,
): string {
  const brand = publicName?.trim();
  return brand && brand.length > 0 ? brand : systemName;
}

export function extractLogoStoragePath(
  logoUrl: string,
  organizationId: string,
): string | null {
  try {
    const url = new URL(logoUrl);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/public\/logos\/(.+)$/,
    );

    if (!match?.[1]) {
      return null;
    }

    const path = decodeURIComponent(match[1]).replace(/\?.*$/, "");
    if (!path.startsWith(`${organizationId}/`)) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

export function isOrganizationSubscriptionActive(org: {
  tier_id: string | null;
  tier_expires_at: string | null;
}): boolean {
  if (!org.tier_id) {
    return false;
  }

  if (!org.tier_expires_at) {
    return true;
  }

  return new Date(org.tier_expires_at).getTime() > Date.now();
}

export function parseProfileMessengers(value: Json | null | undefined): {
  viber: string;
  telegram: string;
  whatsapp: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { viber: "", telegram: "", whatsapp: "" };
  }

  const record = value as Record<string, unknown>;

  return {
    viber: typeof record.viber === "string" ? record.viber : "",
    telegram: typeof record.telegram === "string" ? record.telegram : "",
    whatsapp: typeof record.whatsapp === "string" ? record.whatsapp : "",
  };
}

export const SOCIAL_LINK_KEYS = [
  "instagram",
  "telegram",
  "viber",
  "facebook",
  "vk",
] as const;

export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number];

export const SOCIAL_LINK_LABELS: Record<SocialLinkKey, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  viber: "Viber",
  facebook: "Facebook",
  vk: "ВКонтакте",
};

export function parseProfileSocialLinks(
  value: Json | null | undefined,
): Record<SocialLinkKey, string> {
  const empty = Object.fromEntries(
    SOCIAL_LINK_KEYS.map((key) => [key, ""]),
  ) as Record<SocialLinkKey, string>;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty;
  }

  const record = value as Record<string, unknown>;

  for (const key of SOCIAL_LINK_KEYS) {
    const raw = record[key];
    if (typeof raw === "string") {
      empty[key] = raw;
    }
  }

  return empty;
}

/** Maps social JSON keys to icon filenames under `/image/socials/`. */
const SOCIAL_ICON_ALIASES: Record<string, string> = {
  ok: "ok",
  odnoklassniki: "ok",
  vk: "vk",
  vkontakte: "vk",
};

export function resolveSocialIconPath(key: string): string {
  const normalized = key.trim().toLowerCase();
  const iconKey = SOCIAL_ICON_ALIASES[normalized] ?? normalized;
  return `/image/socials/${iconKey}.svg`;
}

export type SocialLinkEntry = {
  key: string;
  url: string;
  label: string;
  iconPath: string;
};

const SOCIAL_LINK_LABEL_OVERRIDES: Record<string, string> = {
  ok: "Одноклассники",
  odnoklassniki: "Одноклассники",
  vk: "ВКонтакте",
  vkontakte: "ВКонтакте",
  instagram: "Instagram",
  telegram: "Telegram",
  viber: "Viber",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
};

export function collectSocialLinkEntries(
  value: Json | null | undefined,
): SocialLinkEntry[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const entries: SocialLinkEntry[] = [];

  for (const [key, raw] of Object.entries(record)) {
    if (typeof raw !== "string") {
      continue;
    }

    const url = raw.trim();
    if (!url) {
      continue;
    }

    const normalizedKey = key.trim().toLowerCase();
    entries.push({
      key: normalizedKey,
      url,
      label:
        SOCIAL_LINK_LABEL_OVERRIDES[normalizedKey] ??
        normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1),
      iconPath: resolveSocialIconPath(normalizedKey),
    });
  }

  return entries;
}

export function normalizeGalleryUrls(
  gallery: string[] | null | undefined,
): string[] {
  return (gallery ?? [])
    .map((url) => url.trim())
    .filter((url) => url.length > 0 && /^https?:\/\//i.test(url));
}

export function normalizePhoneList(
  phones: string[] | null | undefined,
  phoneMain: string | null | undefined,
): string[] {
  const fromArray = (phones ?? [])
    .map((phone) => phone.trim())
    .filter((phone) => phone.length > 0);

  if (fromArray.length > 0) {
    return fromArray;
  }

  const main = phoneMain?.trim();
  return main ? [main] : [];
}

export function parseProfilePhones(
  phones: string[] | null | undefined,
  phoneMain: string | null | undefined,
): string[] {
  const normalized = (phones ?? [])
    .map((phone) => phone.trim())
    .filter((phone) => phone.length > 0);

  if (normalized.length > 0) {
    return normalized;
  }

  const main = phoneMain?.trim();
  return main ? [main] : [""];
}
