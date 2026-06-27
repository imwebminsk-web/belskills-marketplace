import { type NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

/** Session refresh + auth gate only; tenant RBAC lives in layouts/pages. */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Пропускаем статику и изображения, чтобы не гонять Supabase на каждый ассет
     * и уменьшить шанс гонок при refresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
