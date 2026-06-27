"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { loadAuthContext } from "@/lib/auth/access";
import { getPrimaryActiveStaffTenant } from "@/lib/auth/tenant";
import {
  calculateTierTotalKopecks,
  parseBillingPeriod,
} from "@/lib/utils/pricing";
import { createClient } from "@/lib/supabase/server";

type ActionError = { success: false; error: string };
type ActionSuccess = { success: true; requestId: string };

const paymentMethodSchema = z.enum(["card", "bank_transfer"]);

const billingRequestSchema = z
  .object({
    organizationId: z.string().uuid("Некорректный ID организации"),
    tierId: z.string().trim().min(1, "Укажите тариф"),
    periodMonths: z.coerce.number().int(),
    paymentMethod: paymentMethodSchema,
    unp: z.string().trim().optional(),
    companyName: z.string().trim().optional(),
    legalAddress: z.string().trim().optional(),
    iban: z.string().trim().optional(),
    bic: z.string().trim().optional(),
    directorName: z.string().trim().optional(),
    directorPosition: z.string().trim().optional(),
    basisOfAuthority: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod !== "bank_transfer") {
      return;
    }

    const bankFields = [
      { key: "unp" as const, label: "Укажите УНП" },
      { key: "companyName" as const, label: "Укажите название компании" },
      { key: "legalAddress" as const, label: "Укажите юридический адрес" },
      { key: "iban" as const, label: "Укажите расчётный счёт (IBAN)" },
      { key: "bic" as const, label: "Укажите код банка (BIC)" },
      { key: "directorPosition" as const, label: "Укажите должность руководителя" },
      { key: "directorName" as const, label: "Укажите ФИО руководителя" },
      {
        key: "basisOfAuthority" as const,
        label: "Укажите основание полномочий",
      },
    ];

    for (const field of bankFields) {
      if (!data[field.key]?.length) {
        ctx.addIssue({
          code: "custom",
          message: field.label,
          path: [field.key],
        });
      }
    }
  });

export async function submitBillingRequest(
  formData: FormData,
): Promise<ActionSuccess | ActionError> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, tenants } = await loadAuthContext(user.id);

  if (!profile) {
    return { success: false, error: "Профиль не найден" };
  }

  const primaryTenant = getPrimaryActiveStaffTenant(tenants);

  if (!primaryTenant) {
    return { success: false, error: "Нет активной организации для оплаты" };
  }

  const period = parseBillingPeriod(formData.get("periodMonths"));
  if (!period) {
    return { success: false, error: "Некорректный период оплаты" };
  }

  const parsed = billingRequestSchema.safeParse({
    organizationId: formData.get("organizationId"),
    tierId: formData.get("tierId"),
    periodMonths: formData.get("periodMonths"),
    paymentMethod: formData.get("paymentMethod"),
    unp: formData.get("unp") ?? undefined,
    companyName: formData.get("companyName") ?? undefined,
    legalAddress: formData.get("legalAddress") ?? undefined,
    iban: formData.get("iban") ?? undefined,
    bic: formData.get("bic") ?? undefined,
    directorName: formData.get("directorName") ?? undefined,
    directorPosition: formData.get("directorPosition") ?? undefined,
    basisOfAuthority: formData.get("basisOfAuthority") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные формы",
    };
  }

  const data = parsed.data;

  if (data.organizationId !== primaryTenant.organizationId) {
    return { success: false, error: "Организация не совпадает с вашей школой" };
  }

  const { data: tier, error: tierError } = await supabase
    .from("subscription_tiers")
    .select(
      "id, price_monthly, discount_3_months, discount_6_months, discount_12_months, is_active",
    )
    .eq("id", data.tierId)
    .maybeSingle();

  if (tierError || !tier) {
    return { success: false, error: "Тариф не найден" };
  }

  if (!tier.is_active || tier.price_monthly <= 0) {
    return { success: false, error: "Этот тариф недоступен для оплаты" };
  }

  const amountKopecks = calculateTierTotalKopecks(
    tier.price_monthly,
    period,
    tier,
  );

  const isBank = data.paymentMethod === "bank_transfer";

  const { data: row, error: insertError } = await supabase
    .from("billing_requests")
    .insert({
      organization_id: data.organizationId,
      tier_id: data.tierId,
      period_months: period,
      amount_kopecks: amountKopecks,
      payment_method: data.paymentMethod,
      unp: isBank ? data.unp! : null,
      company_name: isBank ? data.companyName! : null,
      legal_address: isBank ? data.legalAddress! : null,
      iban: isBank ? data.iban! : null,
      bic: isBank ? data.bic! : null,
      director_name: isBank ? data.directorName! : null,
      director_position: isBank ? data.directorPosition! : null,
      basis_of_authority: isBank ? data.basisOfAuthority! : null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("[submitBillingRequest]", insertError?.message);
    return {
      success: false,
      error: insertError?.message ?? "Не удалось создать заявку",
    };
  }

  revalidatePath("/dashboard/invoices");

  return { success: true, requestId: row.id };
}
