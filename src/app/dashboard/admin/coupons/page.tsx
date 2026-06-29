import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCouponsForAdmin } from "@/app/actions/coupon-actions";
import { CouponsAdminClient } from "@/components/dashboard/admin/coupons-admin-client";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Промокоды",
  description: "Управление промокодами и скидками",
};

export default async function AdminCouponsPage() {
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

  const result = await getCouponsForAdmin();
  if (!result.success) {
    throw new Error(result.error);
  }

  const displayName =
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Администратор";

  return (
    <>
      <SiteHeader fullName={displayName} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Промокоды</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Создание и управление промокодами для checkout: процентные и
            фиксированные скидки, лимиты и срок действия.
          </p>
        </div>
        <CouponsAdminClient initialCoupons={result.data} />
      </div>
    </>
  );
}
