import { Badge } from "@/components/ui/badge";
import type { OrganizationTierInfo } from "@/lib/auth/tenant";
import { cn } from "@/lib/utils";

function formatTierExpiryDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

type OrganizationTierBadgeProps = {
  tier: OrganizationTierInfo | null;
  className?: string;
};

export function OrganizationTierBadge({
  tier,
  className,
}: OrganizationTierBadgeProps) {
  if (!tier) {
    return null;
  }

  const label = tier.tierExpiresAt
    ? `${tier.tierName} до ${formatTierExpiryDate(tier.tierExpiresAt)}`
    : `${tier.tierName} · Бессрочно`;

  return (
    <Badge
      variant="outline"
      className={cn(
        "hidden h-auto w-auto max-w-none shrink-0 whitespace-nowrap border-brand/30 bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand sm:inline-flex",
        className,
      )}
      title={label}
    >
      {label}
    </Badge>
  );
}
