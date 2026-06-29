"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import {
  applyCouponToPrice,
  COUPON_ALREADY_USED_MESSAGE,
} from "@/lib/billing/checkout-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CouponRow = {
  id: string;
  name: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

type ActionError = { success: false; error: string };
type ActionOk<T> = { success: true; data: T };

export type ValidateCouponSuccess = {
  success: true;
  message: string;
  newPrice: number;
  couponId: string;
  discountAmount: number;
  discountType: "percent" | "fixed";
  code: string;
};

export type ValidateCouponResult =
  | ValidateCouponSuccess
  | { success: false; message: string };

type CouponForValidation = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number | string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

const couponIdSchema = z.string().uuid("Некорректный ID промокода");

const validateCodeSchema = z
  .string()
  .trim()
  .min(1, "Введите промокод")
  .max(64)
  .transform((value) => value.toUpperCase());

function getCouponValidationError(coupon: CouponForValidation): string | null {
  if (!coupon.is_active) {
    return "Промокод не найден или неактивен";
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return "Срок действия промокода истёк";
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return "Лимит использований промокода исчерпан";
  }

  return null;
}

async function userHasUsedCoupon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  couponId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("billing_requests")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .eq("coupon_id", couponId)
    .neq("status", "cancelled");

  if (error) {
    console.error("[userHasUsedCoupon]", error.message);
    return true;
  }

  return (count ?? 0) > 0;
}

export async function validateCoupon(
  code: string,
  originalPrice: number,
): Promise<ValidateCouponResult> {
  const parsedCode = validateCodeSchema.safeParse(code);
  if (!parsedCode.success) {
    return {
      success: false,
      message: parsedCode.error.issues[0]?.message ?? "Введите промокод",
    };
  }

  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    return { success: false, message: "Некорректная сумма заказа" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Требуется вход в систему" };
  }

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, max_uses, used_count, expires_at, is_active",
    )
    .eq("code", parsedCode.data)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[validateCoupon]", error.message);
    return { success: false, message: "Не удалось проверить промокод" };
  }

  if (!coupon) {
    return { success: false, message: "Промокод не найден или неактивен" };
  }

  const validationError = getCouponValidationError(coupon);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const alreadyUsed = await userHasUsedCoupon(supabase, user.id, coupon.id);
  if (alreadyUsed) {
    return { success: false, message: COUPON_ALREADY_USED_MESSAGE };
  }

  const { newPrice, discountAmount } = applyCouponToPrice(originalPrice, coupon);

  return {
    success: true,
    message: "Промокод применён",
    newPrice,
    couponId: coupon.id,
    discountAmount,
    discountType: coupon.discount_type as "percent" | "fixed",
    code: coupon.code,
  };
}

export async function resolveCouponForCheckout(
  supabase: Awaited<ReturnType<typeof createClient>>,
  couponId: string,
  originalPriceKopecks: number,
  userId: string,
): Promise<
  | { success: true; couponId: string; amountKopecks: number; code: string }
  | { success: false; error: string }
> {
  const parsedId = couponIdSchema.safeParse(couponId);
  if (!parsedId.success) {
    return { success: false, error: "Некорректный промокод" };
  }

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, max_uses, used_count, expires_at, is_active",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error || !coupon) {
    return { success: false, error: "Промокод не найден" };
  }

  const validationError = getCouponValidationError(coupon);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const alreadyUsed = await userHasUsedCoupon(supabase, userId, coupon.id);
  if (alreadyUsed) {
    return { success: false, error: COUPON_ALREADY_USED_MESSAGE };
  }

  const { newPrice } = applyCouponToPrice(originalPriceKopecks, coupon);

  return {
    success: true,
    couponId: coupon.id,
    amountKopecks: newPrice,
    code: coupon.code,
  };
}

const upsertCouponSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Укажите название акции"),
    code: z
      .string()
      .trim()
      .min(1, "Укажите промокод")
      .max(64, "Промокод слишком длинный")
      .transform((value) => value.toUpperCase()),
    discount_type: z.enum(["percent", "fixed"], {
      message: "Выберите тип скидки",
    }),
    discount_value: z.coerce.number().positive("Размер скидки должен быть больше 0"),
    max_uses: z
      .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int().positive()])
      .transform((value) => {
        if (value === "" || value === null || value === undefined) {
          return null;
        }
        return value;
      }),
    expires_at: z
      .union([z.literal(""), z.null(), z.undefined(), z.string().trim()])
      .transform((value) => {
        if (!value || value === "") {
          return null;
        }
        return `${value}T23:59:59.999Z`;
      }),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === "percent" && data.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Процентная скидка не может быть больше 100%",
        path: ["discount_value"],
      });
    }
  });

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "Требуется вход в систему" };
  }

  const profile = await loadGateProfile(user.id);

  if (!profile) {
    return { success: false as const, error: "Профиль не найден" };
  }

  if (!isGlobalAdmin(profile)) {
    return { success: false as const, error: "Доступ только для администратора" };
  }

  return { success: true as const, supabase };
}

function mapCouponRow(row: {
  id: string;
  name: string;
  code: string;
  discount_type: string;
  discount_value: number | string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}): CouponRow {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    discount_type: row.discount_type as CouponRow["discount_type"],
    discount_value: Number(row.discount_value),
    max_uses: row.max_uses,
    used_count: row.used_count,
    expires_at: row.expires_at,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export async function getCouponsForAdmin(): Promise<
  ActionOk<CouponRow[]> | ActionError
> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return auth;
  }

  const adminClient = createAdminClient();
  const client = adminClient ?? auth.supabase;

  const { data, error } = await client
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getCouponsForAdmin]", error.message);
    return { success: false, error: "Не удалось загрузить промокоды" };
  }

  return {
    success: true,
    data: (data ?? []).map(mapCouponRow),
  };
}

export async function upsertCoupon(
  input: z.input<typeof upsertCouponSchema>,
): Promise<ActionOk<CouponRow> | ActionError> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return auth;
  }

  const parsed = upsertCouponSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные",
    };
  }

  const payload = {
    name: parsed.data.name,
    code: parsed.data.code,
    discount_type: parsed.data.discount_type,
    discount_value: parsed.data.discount_value,
    max_uses: parsed.data.max_uses,
    expires_at: parsed.data.expires_at,
    is_active: parsed.data.is_active,
  };

  if (parsed.data.id) {
    const { data, error } = await auth.supabase
      .from("coupons")
      .update(payload)
      .eq("id", parsed.data.id)
      .select("*")
      .single();

    if (error) {
      console.error("[upsertCoupon] update", error.message);
      if (error.code === "23505") {
        return { success: false, error: "Промокод с таким кодом уже существует" };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/admin/coupons");
    return { success: true, data: mapCouponRow(data) };
  }

  const { data, error } = await auth.supabase
    .from("coupons")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[upsertCoupon] insert", error.message);
    if (error.code === "23505") {
      return { success: false, error: "Промокод с таким кодом уже существует" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/coupons");
  return { success: true, data: mapCouponRow(data) };
}

export async function deleteCoupon(
  couponId: string,
): Promise<ActionOk | ActionError> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return auth;
  }

  const parsedId = couponIdSchema.safeParse(couponId);
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Некорректный ID",
    };
  }

  const { error } = await auth.supabase
    .from("coupons")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    console.error("[deleteCoupon]", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/coupons");
  return { success: true };
}
