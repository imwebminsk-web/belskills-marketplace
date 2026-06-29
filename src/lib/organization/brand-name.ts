import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveOrganizationBrandName } from "@/lib/organization/showcase-profile";

/** Загружает `organization_profiles.public_name` для отображения в дашборде. */
export async function fetchOrganizationBrandName(
  supabase: SupabaseClient,
  organizationId: string,
  systemName: string,
): Promise<string> {
  const { data } = await supabase
    .from("organization_profiles")
    .select("public_name")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return resolveOrganizationBrandName(data?.public_name, systemName);
}
