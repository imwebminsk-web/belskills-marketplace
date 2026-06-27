import type { ReactNode } from "react";

import { getSupportUnreadCount } from "@/app/actions/support-actions";
import { getUnreadCounts } from "@/app/actions/chat-receipt-actions";
import { getPendingReviewCounts } from "@/app/actions/grading-actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlobalChatListener } from "@/components/providers/global-chat-listener";
import { GlobalSupportListener } from "@/components/providers/global-support-listener";
import {
  getOrganizationTierInfoSafe,
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
  resolveDashboardShellRole,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

/** URL пункта «Поддержка» — одинаковый для student, teacher и admin навигации. */
const SUPPORT_NAV_URL = "/dashboard/support";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    full_name: string | null;
    avatar_url: string | null;
    role: "admin" | "teacher" | "student";
    is_global_admin: boolean;
  } | null = null;
  let tenants: Awaited<ReturnType<typeof getUserTenantsSafe>> = [];

  if (user) {
    const [{ data, error: profileError }, loadedTenants] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url, role, is_global_admin")
        .eq("id", user.id)
        .maybeSingle(),
      getUserTenantsSafe(user.id),
    ]);

    if (profileError) {
      console.error("[DashboardLayout] profile", profileError.message);
    } else {
      profile = data;
    }

    tenants = loadedTenants;
  }

  const shellRole =
    profile != null
      ? resolveDashboardShellRole(profile.is_global_admin, tenants)
      : "student";

  let organizationTier: Awaited<
    ReturnType<typeof getOrganizationTierInfoSafe>
  > = null;

  if (shellRole === "teacher") {
    const primaryTenant = getPrimaryActiveStaffTenant(tenants);
    if (primaryTenant) {
      organizationTier = await getOrganizationTierInfoSafe(
        primaryTenant.organizationId,
      );
    }
  }

  const displayName =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Пользователь";

  let navBadges: Record<string, number> = {};
  let navPendingBadges: Record<string, number> = {};

  if (user) {
    const supportUnreadRes = await getSupportUnreadCount();
    if (supportUnreadRes.success && supportUnreadRes.count > 0) {
      navBadges[SUPPORT_NAV_URL] = supportUnreadRes.count;
    }

    if (shellRole === "teacher") {
      const [unreadRes, pendingRes] = await Promise.all([
        getUnreadCounts(),
        getPendingReviewCounts(),
      ]);

      if (unreadRes.success) {
        const totalUnread = Object.values(unreadRes.counts).reduce(
          (sum, count) => sum + count,
          0,
        );
        if (totalUnread > 0) {
          navBadges = { ...navBadges, "/dashboard/cohorts": totalUnread };
        }
      }

      if (pendingRes.success) {
        const totalPending = Object.values(pendingRes.counts).reduce(
          (sum, count) => sum + count,
          0,
        );
        if (totalPending > 0) {
          navPendingBadges = { "/dashboard/cohorts": totalPending };
        }
      }
    } else if (shellRole === "student") {
      const unreadRes = await getUnreadCounts();
      if (unreadRes.success) {
        const totalUnread = Object.values(unreadRes.counts).reduce(
          (sum, count) => sum + count,
          0,
        );
        if (totalUnread > 0) {
          navBadges = { ...navBadges, "/dashboard": totalUnread };
        }
      }
    }
  }

  return (
    <div className="h-full overflow-hidden">
      <GlobalChatListener />
      <GlobalSupportListener />
      <DashboardShell
        role={shellRole}
        navBadges={navBadges}
        navPendingBadges={navPendingBadges}
        organizationTier={organizationTier}
        user={{
          name: displayName,
          email: user?.email ?? "",
          avatar: profile?.avatar_url ?? "",
        }}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
