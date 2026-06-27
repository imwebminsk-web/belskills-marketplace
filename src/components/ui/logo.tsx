import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Для логотипа above the fold (лендинг, главная). */
  priority?: boolean;
};

/** Статический логотип из `public/logo.png` (без Image Optimization — проще обновлять файл). */
export function Logo({ className, priority = false }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- локальный PNG в /public
    <img
      src="/logo.png"
      alt="New Education Logo"
      width={2048}
      height={1152}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("h-10 w-auto object-contain", className)}
    />
  );
}
