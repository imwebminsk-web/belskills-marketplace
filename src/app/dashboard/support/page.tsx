import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getAllSupportTickets,
  getStudentTickets,
} from "@/app/actions/support-actions";
import { StudentSupportClient } from "@/components/dashboard/support/student-support-client";
import { TeacherSupportClient } from "@/components/dashboard/support/teacher-support-client";
import { SiteHeader } from "@/components/site-header";
import {
  getUserTenantsSafe,
  resolveDashboardShellRole,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Поддержка",
  description: "Обращения в службу поддержки",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile, error: profileError }, tenants] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, is_global_admin")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTenantsSafe(user.id),
  ]);

  if (profileError || !profile) {
    redirect("/login");
  }

  const shellRole = resolveDashboardShellRole(profile.is_global_admin, tenants);

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Пользователь";

  if (shellRole === "student") {
    const ticketsRes = await getStudentTickets();
    if (!ticketsRes.success) {
      throw new Error(ticketsRes.error);
    }

    return (
      <>
        <SiteHeader fullName={displayName} />
        <div className="flex flex-1 flex-col">
          <StudentSupportClient
            userId={user.id}
            initialTickets={ticketsRes.tickets}
          />
        </div>
      </>
    );
  }

  if (shellRole === "teacher" || shellRole === "admin") {
    const ticketsRes = await getAllSupportTickets("open");
    if (!ticketsRes.success) {
      throw new Error(ticketsRes.error);
    }

    return (
      <>
        <SiteHeader fullName={displayName} />
        <div className="flex flex-1 flex-col">
          <TeacherSupportClient
            userId={user.id}
            initialTickets={ticketsRes.tickets}
            initialFilter="open"
          />
        </div>
      </>
    );
  }

  redirect("/dashboard");
}
