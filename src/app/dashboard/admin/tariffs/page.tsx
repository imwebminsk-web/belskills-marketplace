import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTariffs } from "@/app/actions/tariff-actions";
import { TariffsAdminClient } from "@/components/dashboard/admin/tariffs-admin-client";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Тарифы",
  description: "Управление тарифными планами подписки",
};

export default async function AdminTariffsPage() {
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

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Администратор";

  const result = await getTariffs();
  if (!result.success) {
    throw new Error(result.error);
  }

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Тарифы</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Тарифные планы SaaS: цены, скидки, лимиты и список возможностей.
          </p>
        </div>
        <TariffsAdminClient initialTariffs={result.data} />
      </div>
    </>
  );
}
