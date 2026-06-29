import type { Database } from "@/types/database.types";

export type OrganizationShowcaseStatus =
  Database["public"]["Enums"]["organization_showcase_status"];

export const SHOWCASE_STATUSES = [
  "draft",
  "moderation",
  "published",
  "hidden",
  "blocked",
] as const satisfies readonly OrganizationShowcaseStatus[];

export function isProfilePubliclyVisible(
  status: OrganizationShowcaseStatus,
  deletedAt: string | null | undefined,
): boolean {
  return !deletedAt && status === "published";
}

export function canSubmitProfileForModeration(profile: {
  unp: string | null | undefined;
  legal_name: string | null | undefined;
  slug: string | null | undefined;
}): boolean {
  return Boolean(
    profile.unp?.trim() && profile.legal_name?.trim() && profile.slug?.trim(),
  );
}

export function parseShowcaseStatus(
  value: string | null | undefined,
): OrganizationShowcaseStatus {
  if (value && SHOWCASE_STATUSES.includes(value as OrganizationShowcaseStatus)) {
    return value as OrganizationShowcaseStatus;
  }
  return "draft";
}
