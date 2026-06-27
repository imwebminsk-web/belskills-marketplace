import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getGlobalTeacherStudents } from "@/app/actions/student-actions";
import { StudentsTable } from "@/components/dashboard/teacher/students/students-table";
import { SiteHeader } from "@/components/site-header";
import { hasStaffAccess } from "@/lib/auth/access";
import { getUserTenantsSafe } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Ученики",
  description: "Все ученики ваших курсов и групп",
};

export default async function DashboardStudentsPage() {
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

  if (!hasStaffAccess(profile, tenants)) {
    redirect("/dashboard");
  }

  const studentsRes = await getGlobalTeacherStudents(user.id);
  if (!studentsRes.success) {
    throw new Error(studentsRes.error);
  }

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Пользователь";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col">
        <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-8 px-4 py-8 lg:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ученики</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Все уникальные ученики, записанные в ваши группы. Один ученик
              отображается один раз, даже если состоит в нескольких потоках.
            </p>
          </div>

          <StudentsTable students={studentsRes.students} />
        </main>
      </div>
    </>
  );
}
