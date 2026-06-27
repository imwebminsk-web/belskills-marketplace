"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SignUpState = {
  error?: string;
};

const initial: SignUpState = {};

async function ensureProfileForNewUser(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[signUp] SUPABASE_SERVICE_ROLE_KEY is not configured");
    return "Сервер не настроен для создания профиля.";
  }

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "student",
      is_global_admin: false,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[signUp] profile insert", error.message);
    return "Аккаунт создан, но профиль не сохранён. Обратитесь в поддержку.";
  }

  return null;
}

/**
 * Регистрация через Supabase Auth.
 * При отключённом «Confirm email» сразу выдаётся сессия — редирект на /dashboard.
 */
export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ...initial, error: "Укажите почту и пароль." };
  }

  if (password.length < 6) {
    return { ...initial, error: "Пароль не короче 6 символов." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { ...initial, error: error.message };
  }

  if (data.user) {
    const profileError = await ensureProfileForNewUser(data.user.id);
    if (profileError) {
      return { ...initial, error: profileError };
    }
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    ...initial,
    error:
      "Аккаунт создан, но вход не выполнен. Попробуйте войти на странице входа.",
  };
}

/** Завершает сессию Supabase и перенаправляет на главную. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Совместимость со старыми импортами в проекте. */
export async function signOut() {
  await signOutAction();
}
