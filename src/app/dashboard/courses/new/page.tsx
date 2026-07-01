import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getTaxonomies } from "@/app/actions/taxonomy-actions";
import { CourseSettingsForm } from "@/components/dashboard/teacher/course-settings-form";
import { Button } from "@/components/ui/button";
import { hasStaffAccess } from "@/lib/auth/access";
import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Новый курс",
  description: "Создание нового курса",
};

export default async function NewCoursePage() {
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

  const primaryTenant = getPrimaryActiveStaffTenant(tenants);
  const organizationId = primaryTenant?.organizationId;

  if (!organizationId) {
    redirect("/dashboard/courses");
  }

  const taxonomiesRes = await getTaxonomies();
  if (!taxonomiesRes?.success) {
    console.error("[NewCoursePage] getTaxonomies failed:", taxonomiesRes?.error);
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8">
      <Button variant="ghost" className="w-fit px-0" asChild>
        <Link href="/dashboard/courses">← Назад</Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Новый курс</h1>
        <p className="text-muted-foreground text-sm">
          Заполните основные поля — после создания откроется страница
          редактирования.
        </p>
      </header>

      <CourseSettingsForm
        mode="create"
        organizationId={organizationId}
        taxonomies={
          taxonomiesRes?.success && taxonomiesRes?.data ? taxonomiesRes.data : []
        }
      />
    </div>
  );
}
