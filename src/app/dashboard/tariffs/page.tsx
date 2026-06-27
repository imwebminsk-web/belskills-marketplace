import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TariffsClient } from "@/components/dashboard/tariffs/tariffs-client";
import { SiteHeader } from "@/components/site-header";
import {
  EMPTY_SUBSCRIPTION_STATE,
  getOrganizationSubscriptionStateSafe,
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Тарифы",
  description: "Тарифные планы для авторов и школ",
};

export default async function DashboardTariffsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/login");
  }

  const { data: tariffs, error: tariffsError } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (tariffsError) {
    console.error("[DashboardTariffsPage]", tariffsError.message);
    throw new Error("Не удалось загрузить тарифы");
  }

  const tenants = await getUserTenantsSafe(user.id);
  const primaryTenant = getPrimaryActiveStaffTenant(tenants);

  const subscriptionState = primaryTenant
    ? await getOrganizationSubscriptionStateSafe(primaryTenant.organizationId)
    : EMPTY_SUBSCRIPTION_STATE;

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Пользователь";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Тарифы</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Выберите план для вашей школы. Цены указаны за выбранный период
              оплаты.
            </p>
          </div>
          <TariffsClient
            tariffs={tariffs ?? []}
            subscriptionState={subscriptionState}
          />
        </div>
      </div>
    </>
  );
}
