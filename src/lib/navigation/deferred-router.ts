import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

function runWhenRouterReady(callback: () => void): void {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    setTimeout(callback, 0);
  });
}

/** Откладывает router.refresh — избегает "Router action dispatched before initialization". */
export function deferredRouterRefresh(router: AppRouterInstance): void {
  runWhenRouterReady(() => {
    try {
      router.refresh();
    } catch (error) {
      console.warn("[deferredRouterRefresh]", error);
    }
  });
}

/** Откладывает router.push; при ошибке — полная перезагрузка через location.assign. */
export function deferredRouterPush(
  router: AppRouterInstance,
  href: string,
): void {
  runWhenRouterReady(() => {
    try {
      router.push(href);
    } catch (error) {
      console.warn("[deferredRouterPush] fallback to location.assign", error);
      window.location.assign(href);
    }
  });
}
