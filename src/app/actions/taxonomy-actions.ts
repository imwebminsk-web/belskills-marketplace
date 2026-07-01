"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGlobalAdmin, loadGateProfile } from "@/lib/auth/access";
import { getUserTenantsSafe, hasCreatorOrgAccess } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type TaxonomyRow = Database["public"]["Tables"]["taxonomies"]["Row"];

const taxonomyTypeSchema = z.enum(["category", "marketing_tag"]);

const taxonomyInputSchema = z.object({
  type: taxonomyTypeSchema,
  label: z.string().trim().min(1, "Укажите подпись"),
  value: z
    .string()
    .trim()
    .min(1, "Укажите значение")
    .max(64, "Слишком длинное значение")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Значение: латиница, цифры и дефис (например, b1-plus)",
    ),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

type ActionError = { success: false; error: string };
type ActionOk<T> = { success: true; data: T };

async function requireAdmin():
  Promise<
    | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
    | ActionError
  > {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Требуется вход в систему" };
  }

  const profile = await loadGateProfile(user.id);

  if (!profile) {
    return { success: false, error: "Профиль не найден" };
  }

  if (!isGlobalAdmin(profile)) {
    return { success: false, error: "Доступ только для администратора" };
  }

  return { supabase, userId: user.id };
}

function revalidateTaxonomyPaths() {
  revalidatePath("/dashboard/admin/taxonomies");
  revalidatePath("/dashboard/courses/new");
  revalidatePath("/dashboard/courses");
  revalidatePath("/");
}

export async function getTaxonomies(): Promise<
  ActionOk<TaxonomyRow[]> | ActionError
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Требуется вход в систему" };
  }

  const profile = await loadGateProfile(user.id);
  const tenants = await getUserTenantsSafe(user.id);
  const canRead =
    isGlobalAdmin(profile) ||
    hasCreatorOrgAccess(tenants) ||
    profile?.role === "teacher" ||
    profile?.role === "admin";

  if (!canRead) {
    return {
      success: false,
      error: "Справочник категорий доступен только сотрудникам и преподавателям",
    };
  }

  const { data, error } = await supabase
    .from("taxonomies")
    .select("id, label, type, parent_id, is_active, sort_order, value, created_at")
    .in("type", ["category", "marketing_tag"])
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    console.error("[getTaxonomies]", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as TaxonomyRow[] };
}

export async function createTaxonomy(
  input: z.input<typeof taxonomyInputSchema>,
): Promise<ActionOk<TaxonomyRow> | ActionError> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const parsed = taxonomyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные",
    };
  }

  const { type, label, value, sort_order, is_active, parent_id } = parsed.data;

  const { data, error } = await auth.supabase
    .from("taxonomies")
    .insert({
      type,
      label,
      value,
      sort_order: sort_order ?? 0,
      is_active: is_active ?? true,
      parent_id: type === "category" ? (parent_id ?? null) : null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createTaxonomy]", error.message);
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Такое значение уже есть в этой категории"
          : error.message,
    };
  }

  revalidateTaxonomyPaths();
  return { success: true, data };
}

export async function updateTaxonomy(
  id: string,
  input: z.input<typeof taxonomyInputSchema>,
): Promise<ActionOk<TaxonomyRow> | ActionError> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Некорректный идентификатор" };
  }

  const parsed = taxonomyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные",
    };
  }

  const { type, label, value, sort_order, is_active, parent_id } = parsed.data;

  const { data, error } = await auth.supabase
    .from("taxonomies")
    .update({
      type,
      label,
      value,
      sort_order: sort_order ?? 0,
      ...(is_active === undefined ? {} : { is_active }),
      parent_id: type === "category" ? (parent_id ?? null) : null,
    })
    .eq("id", idParsed.data)
    .select("*")
    .single();

  if (error) {
    console.error("[updateTaxonomy]", error.message);
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Такое значение уже есть в этой категории"
          : error.message,
    };
  }

  revalidateTaxonomyPaths();
  return { success: true, data };
}

export async function toggleTaxonomyActive(
  id: string,
  currentStatus: boolean,
): Promise<ActionOk<TaxonomyRow> | ActionError> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Некорректный идентификатор" };
  }

  const { data, error } = await auth.supabase
    .from("taxonomies")
    .update({ is_active: !currentStatus })
    .eq("id", idParsed.data)
    .select("*")
    .single();

  if (error) {
    console.error("[toggleTaxonomyActive]", error.message);
    return { success: false, error: error.message };
  }

  revalidateTaxonomyPaths();
  return { success: true, data };
}

export async function deleteTaxonomy(
  id: string,
): Promise<ActionOk<{ id: string }> | ActionError> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth;
  }

  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Некорректный идентификатор" };
  }

  const { error } = await auth.supabase
    .from("taxonomies")
    .delete()
    .eq("id", idParsed.data);

  if (error) {
    console.error("[deleteTaxonomy]", error.message);
    return { success: false, error: error.message };
  }

  revalidateTaxonomyPaths();
  return { success: true, data: { id: idParsed.data } };
}
