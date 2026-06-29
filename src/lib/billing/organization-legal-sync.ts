import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export type OrganizationLegalFields = {
  unp: string | null;
  legalName: string | null;
};

type OrganizationProfileLegalRow = Pick<
  Database["public"]["Tables"]["organization_profiles"]["Row"],
  "unp" | "legal_name"
>;

/** Последние B2B-реквизиты из счетов организации (`billing_requests`). */
export async function fetchBillingLegalFallback(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<OrganizationLegalFields> {
  const { data, error } = await supabase
    .from("billing_requests")
    .select("unp, company_name")
    .eq("organization_id", organizationId)
    .eq("payment_method", "bank_transfer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[fetchBillingLegalFallback]", error.message);
    return { unp: null, legalName: null };
  }

  return {
    unp: data?.unp?.trim() || null,
    legalName: data?.company_name?.trim() || null,
  };
}

export function mergeOrganizationProfileLegalFields<
  T extends OrganizationProfileLegalRow,
>(profile: T, fallback: OrganizationLegalFields): T {
  return {
    ...profile,
    unp: profile.unp?.trim() || fallback.unp,
    legal_name: profile.legal_name?.trim() || fallback.legalName,
  };
}

export async function getOrganizationProfileWithBillingLegal<
  T extends OrganizationProfileLegalRow,
>(
  supabase: SupabaseClient<Database>,
  profile: T | null,
  organizationId: string,
): Promise<T | null> {
  if (!profile) {
    return null;
  }

  const needsUnp = !profile.unp?.trim();
  const needsLegalName = !profile.legal_name?.trim();

  if (!needsUnp && !needsLegalName) {
    return profile;
  }

  const fallback = await fetchBillingLegalFallback(supabase, organizationId);
  return mergeOrganizationProfileLegalFields(profile, fallback);
}

/** Showcase → billing: синхронизация УНП и юр. названия в счетах. */
export async function syncLegalFieldsToBillingRequests(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  fields: OrganizationLegalFields,
): Promise<void> {
  const patch = {
    unp: fields.unp,
    company_name: fields.legalName,
  };

  const { error: pendingError } = await supabase
    .from("billing_requests")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("payment_method", "bank_transfer")
    .eq("status", "pending");

  if (pendingError) {
    console.error("[syncLegalFieldsToBillingRequests] pending", pendingError.message);
  }

  const { data: latest, error: latestFetchError } = await supabase
    .from("billing_requests")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("payment_method", "bank_transfer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestFetchError) {
    console.error(
      "[syncLegalFieldsToBillingRequests] latest fetch",
      latestFetchError.message,
    );
    return;
  }

  if (!latest?.id) {
    return;
  }

  const { error: latestUpdateError } = await supabase
    .from("billing_requests")
    .update(patch)
    .eq("id", latest.id);

  if (latestUpdateError) {
    console.error(
      "[syncLegalFieldsToBillingRequests] latest update",
      latestUpdateError.message,
    );
  }
}

/** Billing → showcase: синхронизация УНП и юр. названия в витрину. */
export async function syncLegalFieldsToOrganizationProfile(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  fields: OrganizationLegalFields,
): Promise<void> {
  const { error } = await supabase
    .from("organization_profiles")
    .update({
      unp: fields.unp,
      legal_name: fields.legalName,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (error) {
    console.error("[syncLegalFieldsToOrganizationProfile]", error.message);
  }
}
