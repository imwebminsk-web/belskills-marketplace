import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { LogoutButton } from "@/components/site/logout-button";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = Boolean(user);

  return (
    <header className="border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center">
          <Logo className="h-12" />
        </Link>

        <nav className="flex items-center gap-2">
          <ModeToggle />
          {!isAuthed ? (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-brand text-brand-foreground hover:bg-brand/90",
              )}
            >
              Войти
            </Link>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    size: "sm",
                  }),
                  "border-brand text-brand hover:bg-brand/10",
                )}
              >
                Кабинет
              </Link>
              <LogoutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

