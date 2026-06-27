import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InvoicesAdminClient } from "@/components/dashboard/admin/invoices-admin-client";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Счета клиентов",
  description: "Управление заявками на оплату подписки",
};

export type AdminBillingRequestRow = {
  id: string;
  invoiceNumber: number;
  createdAt: string;
  companyName: string | null;
  tierId: string;
  tierName: string;
  periodMonths: number;
  amountKopecks: number;
  status: string;
  paymentMethod: string;
};

export default async function AdminInvoicesPage() {
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

  const { data: rows, error } = await supabase
    .from("billing_requests")
    .select(
      `
        id,
        invoice_number,
        created_at,
        company_name,
        tier_id,
        period_months,
        amount_kopecks,
        status,
        payment_method,
        subscription_tiers (
          name
        )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminInvoicesPage]", error.message);
    throw new Error("Не удалось загрузить счета клиентов");
  }

  const requests: AdminBillingRequestRow[] = (rows ?? []).map((row) => {
    const tier = row.subscription_tiers as { name: string } | null;

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      createdAt: row.created_at,
      companyName: row.company_name,
      tierId: row.tier_id,
      tierName: tier?.name?.trim() || row.tier_id,
      periodMonths: row.period_months,
      amountKopecks: row.amount_kopecks,
      status: row.status,
      paymentMethod: row.payment_method,
    };
  });

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Администратор";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Счета клиентов</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Все заявки на оплату подписки. Подтверждение оплаты автоматически
            активирует тариф через историю подписок.
          </p>
        </div>
        <InvoicesAdminClient initialRequests={requests} />
      </div>
    </>
  );
}
