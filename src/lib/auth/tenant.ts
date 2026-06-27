import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type ProfileRole = Database["public"]["Enums"]["profile_role"];

const ORGANIZATION_MEMBER_ROLES = ["owner", "curator"] as const;

export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];

export type UserTenant = {
  organizationId: string;
  organizationName: string;
  organizationTierId: string | null;
  role: OrganizationMemberRole;
};

export type OrganizationTierInfo = {
  tierName: string;
  tierExpiresAt: string | null;
};

export type OrganizationSubscriptionState = {
  currentTierId: string | null;
  expiresAt: string | null;
  hasUsedTrial: boolean;
};

export const EMPTY_SUBSCRIPTION_STATE: OrganizationSubscriptionState = {
  currentTierId: null,
  expiresAt: null,
  hasUsedTrial: false,
};

type OrganizationMemberWithOrganization =
  Database["public"]["Tables"]["organization_members"]["Row"] & {
    organizations: Pick<
      Database["public"]["Tables"]["organizations"]["Row"],
      "id" | "name" | "tier_id"
    > | null;
  };

function isOrganizationMemberRole(
  value: string,
): value is OrganizationMemberRole {
  return (ORGANIZATION_MEMBER_ROLES as readonly string[]).includes(value);
}

function mapMemberToUserTenant(
  row: OrganizationMemberWithOrganization,
): UserTenant | null {
  const organization = row.organizations;

  if (!organization || !isOrganizationMemberRole(row.role)) {
    return null;
  }

  return {
    organizationId: row.organization_id,
    organizationName: organization.name,
    organizationTierId: organization.tier_id,
    role: row.role,
  };
}

/**
 * Returns all organizations the user belongs to, with org metadata and membership role.
 * Server-only: uses the Supabase session from cookies (RLS applies).
 */
export function isOrgStaffRole(role: OrganizationMemberRole): boolean {
  return role === "owner" || role === "curator";
}

/** First org where the user can manage content (owner, then curator). */
export function getPrimaryActiveStaffTenant(
  tenants: UserTenant[],
): UserTenant | null {
  return (
    tenants.find((tenant) => tenant.role === "owner") ??
    tenants.find((tenant) => tenant.role === "curator") ??
    null
  );
}

function hasCreatorOrgAccess(tenants: UserTenant[]): boolean {
  return tenants.some(
    (tenant) => tenant.role === "owner" || tenant.role === "curator",
  );
}

export { hasCreatorOrgAccess };

/** Maps platform admin flag + org membership to the sidebar shell role (UI unchanged). */
export function resolveDashboardShellRole(
  isGlobalAdmin: boolean,
  tenants: UserTenant[],
): ProfileRole {
  if (isGlobalAdmin) {
    return "admin";
  }

  if (hasCreatorOrgAccess(tenants)) {
    return "teacher";
  }

  return "student";
}

export async function getUserTenantsSafe(userId: string): Promise<UserTenant[]> {
  try {
    return await getUserTenants(userId);
  } catch (error) {
    console.error(
      "[getUserTenantsSafe]",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export async function getUserTenants(userId: string): Promise<UserTenant[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
        organization_id,
        role,
        user_id,
        organizations (
          id,
          name,
          tier_id
        )
      `,
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(`getUserTenants failed: ${error.message}`);
  }

  return (data as OrganizationMemberWithOrganization[] | null ?? [])
    .map(mapMemberToUserTenant)
    .filter((tenant): tenant is UserTenant => tenant !== null);
}

type OrganizationTierRow = {
  tier_id: string | null;
  tier_expires_at: string | null;
  subscription_tiers: { name: string } | null;
};

/** Readable tier label + expiry for the creator dashboard header. */
export async function getOrganizationTierInfo(
  organizationId: string,
): Promise<OrganizationTierInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
        tier_id,
        tier_expires_at,
        subscription_tiers (
          name
        )
      `,
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`getOrganizationTierInfo failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as OrganizationTierRow;
  const tierName =
    row.subscription_tiers?.name?.trim() ||
    row.tier_id?.trim() ||
    "Без тарифа";

  return {
    tierName,
    tierExpiresAt: row.tier_expires_at,
  };
}

export async function getOrganizationTierInfoSafe(
  organizationId: string,
): Promise<OrganizationTierInfo | null> {
  try {
    return await getOrganizationTierInfo(organizationId);
  } catch (error) {
    console.error(
      "[getOrganizationTierInfoSafe]",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/** Active tier, expiry, and trial usage for tariff button matrix. */
export async function getOrganizationSubscriptionState(
  organizationId: string,
): Promise<OrganizationSubscriptionState> {
  const supabase = await createClient();

  const [orgResult, trialResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("tier_id, tier_expires_at")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("subscription_history")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("tier_id", "trial")
      .limit(1),
  ]);

  if (orgResult.error) {
    throw new Error(
      `getOrganizationSubscriptionState failed: ${orgResult.error.message}`,
    );
  }

  if (trialResult.error) {
    throw new Error(
      `getOrganizationSubscriptionState trial check failed: ${trialResult.error.message}`,
    );
  }

  return {
    currentTierId: orgResult.data?.tier_id ?? null,
    expiresAt: orgResult.data?.tier_expires_at ?? null,
    hasUsedTrial: (trialResult.data?.length ?? 0) > 0,
  };
}

export async function getOrganizationSubscriptionStateSafe(
  organizationId: string,
): Promise<OrganizationSubscriptionState> {
  try {
    return await getOrganizationSubscriptionState(organizationId);
  } catch (error) {
    console.error(
      "[getOrganizationSubscriptionStateSafe]",
      error instanceof Error ? error.message : error,
    );
    return EMPTY_SUBSCRIPTION_STATE;
  }
}
