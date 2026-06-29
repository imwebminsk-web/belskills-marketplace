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
