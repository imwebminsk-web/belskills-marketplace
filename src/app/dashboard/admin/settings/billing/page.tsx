import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPlatformSettings } from "@/app/actions/admin-settings-actions";
import { BillingSettingsClient } from "@/components/dashboard/admin/billing-settings-client";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Настройки биллинга",
  description: "Реквизиты платформы для счетов и актов",
};

export default async function AdminBillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, is_global_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/login");
  }

  if (!profile.is_global_admin) {
    redirect("/dashboard");
  }

  const result = await getPlatformSettings();
  if (!result.success) {
    throw new Error(result.error);
  }

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Администратор";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Настройки биллинга</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Реквизиты платформы для выставления счетов и актов выполненных работ.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Реквизиты организации</CardTitle>
            <CardDescription>
              Данные используются в PDF-счетах и актах для B2B-клиентов.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingSettingsClient settings={result.data} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
