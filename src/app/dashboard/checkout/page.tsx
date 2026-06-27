import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CheckoutForm, type B2BBillingDetails } from "@/components/dashboard/billing/checkout-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPrimaryActiveStaffTenant, getUserTenantsSafe } from "@/lib/auth/tenant";
import {
  calculateTierTotalKopecks,
  formatPriceByn,
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Ваш заказ</CardTitle>
            <CardDescription>Сводка по выбранному тарифу</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <p className="font-semibold">{tier.name}</p>
                <p className="text-muted-foreground text-sm">{periodLabel}</p>
              </div>
              <p className="text-lg font-bold">{formatPriceByn(totalKopecks)}</p>
            </div>

            {discountPercent > 0 ? (
              <p className="text-brand text-sm font-medium">
                Скидка {discountPercent}% за период оплаты
              </p>
            ) : null}

            <dl className="text-muted-foreground space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Организация</dt>
                <dd className="text-foreground text-right font-medium">
                  {primaryTenant.organizationName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Период</dt>
                <dd className="text-foreground font-medium">{periodLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2">
                <dt className="text-foreground font-semibold">Итого</dt>
                <dd className="text-foreground text-lg font-bold">
                  {formatPriceByn(totalKopecks)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Способ оплаты</CardTitle>
            <CardDescription>
              Оплата картой или выставление счёта для юридического лица
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CheckoutForm
              organizationId={primaryTenant.organizationId}
              tierId={tier.id}
              period={period}
              initialB2BDetails={initialB2BDetails}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
