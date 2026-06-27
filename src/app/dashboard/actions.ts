"use server";

import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
  resolveDashboardShellRole,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

import { fetchDashboardData, type DashboardData } from "./fetch-dashboard-data";

/**
 * Server Action: проверка сессии и загрузка дашборда (безопасно при вызове с клиента).
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile, error: profileError }, tenants] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_global_admin")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTenantsSafe(user.id),
  ]);

  if (profileError || !profile) return null;

  const shellRole = resolveDashboardShellRole(profile.is_global_admin, tenants);
  const primaryTenant = getPrimaryActiveStaffTenant(tenants);

  return fetchDashboardData(
    user.id,
    shellRole,
    shellRole === "teacher" ? primaryTenant?.organizationId : undefined,
  );
}
