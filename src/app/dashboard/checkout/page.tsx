import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CheckoutClient } from "@/components/dashboard/billing/checkout-client";
import type { B2BBillingDetails } from "@/components/dashboard/billing/checkout-form";
import { Button } from "@/components/ui/button";
import {
  organizationHasPendingInvoice,
  userHasPendingInvoice,
} from "@/lib/billing/checkout-rules";
import { fetchOrganizationBrandName } from "@/lib/organization/brand-name";
import { getPrimaryActiveStaffTenant, getUserTenantsSafe } from "@/lib/auth/tenant";
import {
  calculateTierTotalKopecks,
  getDiscountPercentForPeriod,
  parseBillingPeriod,
} from "@/lib/utils/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Оформление подписки",
  description: "Выбор способа оплаты тарифа",
};

type CheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : value?.[0];
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const tierId = readParam(params, "tier");
  const period = parseBillingPeriod(readParam(params, "period"));

  if (!tierId || !period) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenants = await getUserTenantsSafe(user.id);
  const primaryTenant = getPrimaryActiveStaffTenant(tenants);

  if (!primaryTenant) {
    redirect("/dashboard/settings");
  }

  const { data: tier, error: tierError } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("id", tierId)
    .eq("is_active", true)
    .maybeSingle();

  if (tierError || !tier || tier.price_monthly <= 0) {
    notFound();
  }

  const { data: lastB2BRequest } = await supabase
    .from("billing_requests")
    .select(
      "unp, company_name, legal_address, iban, bic, director_name, director_position, basis_of_authority",
    )
    .eq("organization_id", primaryTenant.organizationId)
    .eq("payment_method", "bank_transfer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialB2BDetails: B2BBillingDetails | null = null;

  if (lastB2BRequest) {
    initialB2BDetails = {
      unp: lastB2BRequest.unp ?? "",
      companyName: lastB2BRequest.company_name ?? "",
      legalAddress: lastB2BRequest.legal_address ?? "",
      iban: lastB2BRequest.iban ?? "",
      bic: lastB2BRequest.bic ?? "",
      directorName: lastB2BRequest.director_name ?? "",
      directorPosition: lastB2BRequest.director_position ?? "",
      basisOfAuthority: lastB2BRequest.basis_of_authority ?? "",
    };
  }

  const discountPercent = getDiscountPercentForPeriod(tier, period);
  const totalKopecks = calculateTierTotalKopecks(
    tier.price_monthly,
    period,
    tier,
  );

  const periodLabel =
    period === 1 ? "1 месяц" : `${period} месяца`;

  const [userPending, orgPending, organizationBrandName] = await Promise.all([
    userHasPendingInvoice(supabase, user.id),
    organizationHasPendingInvoice(supabase, primaryTenant.organizationId),
    fetchOrganizationBrandName(
      supabase,
      primaryTenant.organizationId,
      primaryTenant.organizationName,
    ),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Оформление</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Выберите способ оплаты и завершите оформление подписки.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/tariffs">← К тарифам</Link>
        </Button>
      </div>

      <CheckoutClient
        organizationId={primaryTenant.organizationId}
        organizationBrandName={organizationBrandName}
        tierId={tier.id}
        tierName={tier.name}
        period={period}
        periodLabel={periodLabel}
        originalTotalKopecks={totalKopecks}
        tierDiscountPercent={discountPercent}
        initialB2BDetails={initialB2BDetails}
        hasPendingInvoice={userPending || orgPending}
      />
    </div>
  );
}
