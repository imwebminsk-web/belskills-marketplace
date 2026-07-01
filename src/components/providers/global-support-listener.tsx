"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { deferredRouterRefresh } from "@/lib/navigation/deferred-router";
import { createClient } from "@/lib/supabase/client";

const GLOBAL_SUPPORT_CHANNEL_NAME = "global-support-messages";

export function GlobalSupportListener() {
  const router = useRouter();
  const currentUserIdRef = useRef<string | null>(null);
  const routerReadyRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    routerReadyRef.current = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) {
        return;
      }

      currentUserIdRef.current = user.id;

      const nextChannel = supabase
        .channel(GLOBAL_SUPPORT_CHANNEL_NAME)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
          },
          (payload) => {
            if (!routerReadyRef.current) return;
            const row = payload.new as { sender_id?: string } | null;
            if (row?.sender_id && row.sender_id !== currentUserIdRef.current) {
              deferredRouterRefresh(router);
            }
          },
        )
        .subscribe();

      if (cancelled) {
        void supabase.removeChannel(nextChannel);
        return;
      }

      channel = nextChannel;
      routerReadyRef.current = true;
    })();

    return () => {
      cancelled = true;
      routerReadyRef.current = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router]);

  return null;
}
