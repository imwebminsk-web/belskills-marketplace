import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TariffsClient } from "@/components/dashboard/tariffs/tariffs-client";
import { SiteHeader } from "@/components/site-header";
import { organizationHasPendingInvoice } from "@/lib/billing/checkout-rules";
import { validateCheckoutTransition } from "@/lib/billing-math";
import { fetchOrganizationContentCounts } from "@/lib/billing/fetch-organization-content-counts";
import {
  EMPTY_SUBSCRIPTION_STATE,
  getOrganizationSubscriptionStateSafe,
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
} from "@/lib/auth/tenant";
import { isFreeTariff } from "@/lib/tariffs/group-tariffs";
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
    .or("is_active.eq.true,id.eq.free,id.eq.trial,price_monthly.eq.0")
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

  const hasPendingInvoice = primaryTenant
    ? await organizationHasPendingInvoice(
        supabase,
        primaryTenant.organizationId,
      )
    : false;

  const visibleTariffs = (tariffs ?? []).filter(
    (tariff) => tariff.is_active || isFreeTariff(tariff),
  );

  let checkoutBlockReasons: Record<string, string | null> = {};

  if (primaryTenant) {
    const [{ data: organizationBillingState }, contentCounts] = await Promise.all([
      supabase
        .from("organizations")
        .select(
          `
          tier_id,
          tier_expires_at,
          subscription_tiers (
            price_monthly,
            category
          )
        `,
        )
        .eq("id", primaryTenant.organizationId)
        .maybeSingle(),
      fetchOrganizationContentCounts(supabase, primaryTenant.organizationId),
    ]);

    const currentTier = Array.isArray(
      organizationBillingState?.subscription_tiers,
    )
      ? organizationBillingState?.subscription_tiers[0]
      : organizationBillingState?.subscription_tiers;

    checkoutBlockReasons = Object.fromEntries(
      visibleTariffs
        .filter((tariff) => tariff.price_monthly > 0 && tariff.id !== "trial")
        .map((tariff) => [
          tariff.id,
          validateCheckoutTransition({
            currentTierId: organizationBillingState?.tier_id ?? null,
            nextTierId: tariff.id,
            currentTierCategory: currentTier?.category ?? null,
            nextTierCategory: tariff.category ?? null,
            currentTierExpiresAt: organizationBillingState?.tier_expires_at ?? null,
            currentTierMonthlyKopecks: currentTier?.price_monthly ?? null,
            nextTierMonthlyKopecks: tariff.price_monthly,
            nextTierLimits: tariff.limits,
            currentCourseCount: contentCounts.currentCourseCount,
            totalLessonCount: contentCounts.totalLessonCount,
          }).error,
        ]),
    );
  }

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
            tariffs={visibleTariffs}
            subscriptionState={subscriptionState}
            hasPendingInvoice={hasPendingInvoice}
            checkoutBlockReasons={checkoutBlockReasons}
          />
        </div>
      </div>
    </>
  );
}
