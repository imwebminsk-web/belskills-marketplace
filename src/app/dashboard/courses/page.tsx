import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TeacherCourseCard } from "@/components/dashboard/teacher/TeacherCourseCard";
import type { TeacherCourseCardModel } from "@/components/dashboard/teacher/TeacherCourseCard";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  getStaffOrganizationIds,
  hasStaffAccess,
} from "@/lib/auth/access";
import { getUserTenantsSafe } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Мои курсы",
  description: "Курсы преподавателя и создание нового курса",
};

export default async function DashboardCoursesPage() {
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

  let list: TeacherCourseCardModel[] = [];

  if (profile.is_global_admin) {
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, title, description, status, price, slug, image_url")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DashboardCoursesPage]", error.message);
    } else {
      list = courses ?? [];
    }
  } else {
    const orgIds = getStaffOrganizationIds(tenants);
    if (orgIds.length > 0) {
      const { data: courses, error } = await supabase
        .from("courses")
        .select("id, title, description, status, price, slug, image_url")
        .in("organization_id", orgIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DashboardCoursesPage]", error.message);
      } else {
        list = courses ?? [];
      }
    }
  }
  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Пользователь";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col">
        <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-8 px-4 py-6 lg:px-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Мои курсы</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Создавайте курсы и переходите к редактированию по кнопке на карточке.
              </p>
            </div>
            <div className="w-full shrink-0 sm:w-auto">
              <Button asChild>
                <Link href="/dashboard/courses/new">Создать курс</Link>
              </Button>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="border-muted-foreground/20 bg-muted/30 text-muted-foreground flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
              <p className="max-w-md text-base">
                У вас пока нет курсов. Создайте свой первый — кнопка{" "}
                <span className="text-foreground font-medium">«Создать курс»</span>{" "}
                справа вверху.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((course) => (
                <TeacherCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
