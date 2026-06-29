import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InvoicesClient } from "@/components/dashboard/invoices/invoices-client";
import {
  getPrimaryActiveStaffTenant,
  getUserTenantsSafe,
} from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Счета и акты",
  description: "Счета и акты выполненных работ по подписке",
};

export type InvoiceRow = {
  id: string;
  invoiceNumber: number;
  createdAt: string;
  tierId: string;
  tierName: string;
  periodMonths: number;
  amountKopecks: number;
  paymentMethod: string;
  status: string;
  description: string | null;
};

export default async function InvoicesPage() {
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

  const { data: rows, error } = await supabase
    .from("billing_requests")
    .select(
      `
        id,
        invoice_number,
        created_at,
        tier_id,
        period_months,
        amount_kopecks,
        payment_method,
        status,
        description,
        subscription_tiers (
          name
        )
      `,
    )
    .eq("organization_id", primaryTenant.organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[InvoicesPage]", error.message);
    throw new Error("Не удалось загрузить счета");
  }

  const invoices: InvoiceRow[] = (rows ?? []).map((row) => {
    const tier = row.subscription_tiers as { name: string } | null;

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      createdAt: row.created_at,
      tierId: row.tier_id,
      tierName: tier?.name?.trim() || row.tier_id,
      periodMonths: row.period_months,
      amountKopecks: row.amount_kopecks,
      paymentMethod: row.payment_method,
      status: row.status,
      description: row.description,
    };
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Счета и акты</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          История выставленных счетов и актов для организации «
          {primaryTenant.organizationName}».
        </p>
      </div>
      <InvoicesClient invoices={invoices} />
    </div>
  );
}
