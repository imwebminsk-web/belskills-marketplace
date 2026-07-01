import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
  hasCreatorOrgAccess,
  isOrgStaffRole,
  type UserTenant,
} from "./tenant";

export type GateProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "role" | "is_global_admin"
>;

/** Partial profile rows from page-level Supabase selects. */
export type GateProfileLike = {
  id?: string;
  role?: Database["public"]["Enums"]["profile_role"];
  is_global_admin?: boolean | null;
};

export type GlobalAdminProfile = GateProfile & {
  full_name: string | null;
};

export function isGlobalAdmin(
  profile: GateProfileLike | null | undefined,
): boolean {
  return profile?.is_global_admin === true;
}

/** Server Component guard: redirects unauthenticated or non-admin users. */
export async function requireGlobalAdmin(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  profile: GlobalAdminProfile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await supabase
    .from("profiles")
    .select("id, role, is_global_admin, full_name")
    .eq("id", user.id)
    .maybeSingle()
    .then(({ data }) => data);

  if (!profile || !isGlobalAdmin(profile)) {
    redirect("/dashboard");
  }

  return { supabase, user, profile };
}

export function hasStaffAccess(
  profile: GateProfileLike | null | undefined,
  tenants: UserTenant[],
): boolean {
  return isGlobalAdmin(profile) || hasCreatorOrgAccess(tenants);
}

export function canAccessOrganization(
  profile: GateProfileLike | null | undefined,
  tenants: UserTenant[],
  organizationId: string,
): boolean {
  if (isGlobalAdmin(profile)) {
    return true;
  }

  return tenants.some(
    (tenant) =>
      tenant.organizationId === organizationId && isOrgStaffRole(tenant.role),
  );
}

export function canManageCourse(
  profile: GateProfileLike | null | undefined,
  tenants: UserTenant[],
  course: { organization_id: string | null },
): boolean {
  if (isGlobalAdmin(profile)) {
    return true;
  }

  if (!course.organization_id) {
    return false;
  }

  return canAccessOrganization(profile, tenants, course.organization_id);
}

/** User IDs of organization staff (owner/curator) for chat styling and mentions. */
export async function getOrganizationStaffUserIds(
  organizationId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "curator"]);

  if (error) {
    console.error("[getOrganizationStaffUserIds]", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.user_id);
}

export function getStaffOrganizationIds(tenants: UserTenant[]): string[] {
  return tenants
    .filter((tenant) => isOrgStaffRole(tenant.role))
    .map((tenant) => tenant.organizationId);
}

export async function loadGateProfile(
  userId: string,
): Promise<GateProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, is_global_admin")
    .eq("id", userId)
    .maybeSingle();

  return data;
}

export async function loadAuthContext(userId: string) {
  const [profile, tenants] = await Promise.all([
    loadGateProfile(userId),
    getUserTenantsSafe(userId),
  ]);

  return {
    profile,
    tenants,
    primaryTenant: getPrimaryActiveStaffTenant(tenants),
  };
}
