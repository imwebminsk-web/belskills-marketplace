import {
  getStudentDashboardCourses,
  getStudentProgress,
} from "@/app/actions/student-dashboard-actions";
import { getUnreadCounts } from "@/app/actions/chat-receipt-actions";
import { UsersTable } from "@/components/dashboard/admin/users-table";
import { ActivityFeedWidget } from "@/components/dashboard/teacher/activity-feed-widget";
import { PendingReviewsWidget } from "@/components/dashboard/teacher/pending-reviews-widget";
import { StudentDashboardHome } from "@/components/dashboard/student/student-dashboard-home";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

import { fetchDashboardData } from "./fetch-dashboard-data";

async function renderStudentDashboard(
  userId: string,
  displayName: string,
) {
  const supabase = await createClient();

  const [progressRes, coursesRes, unreadRes] = await Promise.all([
    getStudentProgress(userId),
    getStudentDashboardCourses(userId),
    getUnreadCounts(),
  ]);

  const items = progressRes.success ? progressRes.items : [];
  const courseSummaries = coursesRes.success ? coursesRes.courses : [];
  const unreadMap = unreadRes.success ? unreadRes.counts : {};

  if (!progressRes.success) {
    console.error("[StudentDashboard] progress", progressRes.error);
  }
  if (!coursesRes.success) {
    console.error("[StudentDashboard] courses", coursesRes.error);
  }

  const { data: enrollRows, error: enrollError } = await supabase
    .from("enrollments")
    .select("course_id, cohort_id")
    .eq("user_id", userId);

  if (enrollError) {
    console.error("[StudentDashboard] enrollments", enrollError.message);
  }

  const cohortIdByCourseId: Record<string, string | null> = {};
  for (const row of enrollRows ?? []) {
    cohortIdByCourseId[row.course_id] = row.cohort_id;
  }

  const needsAttention = items.filter(
    (item) => item.type === "assignment" && item.status === "rejected",
  );

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col min-w-0">
        <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
          <StudentDashboardHome
            needsAttention={needsAttention}
            courseSummaries={courseSummaries}
            unreadMap={unreadMap}
            cohortIdByCourseId={cohortIdByCourseId}
          />
        </div>
      </div>
    </>
  );
}

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return renderStudentDashboard("", "User");
  }

  const [{ data: profile, error: profileError }, tenants] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, is_global_admin")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTenantsSafe(user.id),
  ]);

  if (profileError) {
    console.error("[Dashboard] profile", profileError.message);
  }

  const displayName =
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  if (profile?.is_global_admin) {
    try {
      const payload = await fetchDashboardData(user.id, "admin");

      return (
        <>
          <SiteHeader fullName={displayName} />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex min-w-0 flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards adminMetrics={payload.adminMetrics} cards={[]} />
                <UsersTable
                  users={payload.adminUsers ?? []}
                  currentUserId={user.id}
                />
              </div>
            </div>
          </div>
        </>
      );
    } catch (error) {
      console.error(
        "[Dashboard] admin",
        error instanceof Error ? error.message : error,
      );
      return renderStudentDashboard(user.id, displayName);
    }
  }

  if (profile != null) {
    const staffTenant = getPrimaryActiveStaffTenant(tenants);

    if (staffTenant) {
      try {
        const payload = await fetchDashboardData(
          user.id,
          "teacher",
          staffTenant.organizationId,
        );

        return (
          <>
            <SiteHeader fullName={displayName} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <SectionCards
                    cards={payload.sectionCards}
                    teacherMetrics={payload.teacherMetrics}
                  />
                  <PendingReviewsWidget
                    reviews={payload.pendingReviews ?? []}
                  />
                  <ActivityFeedWidget events={payload.activityEvents ?? []} />
                </div>
              </div>
            </div>
          </>
        );
      } catch (error) {
        console.error(
          "[Dashboard] teacher org",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  return renderStudentDashboard(user.id, displayName);
}
