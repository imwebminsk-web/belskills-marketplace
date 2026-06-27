import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAttemptGradingDetails } from "@/app/actions/grading-actions";
import { TeacherAttemptGradingView } from "@/components/dashboard/teacher/TeacherAttemptGradingView";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasStaffAccess } from "@/lib/auth/access";
import { getUserTenantsSafe } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ attemptId: string }>;
};

export const metadata: Metadata = {
  title: "Проверка теста",
  description: "Ручная проверка развёрнутых ответов ученика",
};

export default async function AttemptGradePage({ params }: PageProps) {
  const { attemptId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/dashboard/gradebook/attempts/${attemptId}/grade`)}`,
    );
  }

  const [{ data: profile, error: profileError }, tenants] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_global_admin")
      .eq("id", user.id)
      .maybeSingle(),
    getUserTenantsSafe(user.id),
  ]);

  if (profileError || !profile) {
    redirect("/dashboard");
  }

  if (!hasStaffAccess(profile, tenants)) {
    redirect("/dashboard");
  }

  const result = await getAttemptGradingDetails(attemptId);

  if (!result.success) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Не удалось открыть проверку</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <TeacherAttemptGradingView data={result.data} />
    </div>
  );
}
