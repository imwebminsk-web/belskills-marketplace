"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    setPending(false);

    if (error) {
      // Если нужно — можно вывести уведомление, но сейчас просто возвращаемся.
      return;
    }

    window.location.assign("/");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleLogout}
    >
      {pending ? "Выходим…" : "Выход"}
    </Button>
  );
}

