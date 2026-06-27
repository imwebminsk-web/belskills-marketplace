-- Expand subscription_tiers for billing limits, feature flags, and multi-month discounts.
-- Safe to re-run: every column uses ADD COLUMN IF NOT EXISTS.

BEGIN;

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price_monthly integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_3_months integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_6_months integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_12_months integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS presents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority_level integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.subscription_tiers.description IS
  'Marketing / admin description of the plan.';

COMMENT ON COLUMN public.subscription_tiers.price_monthly IS
  'Base monthly price in minor currency units (e.g. kopecks / cents).';

COMMENT ON COLUMN public.subscription_tiers.discount_3_months IS
  'Discount percent (0–100) applied when billing every 3 months.';

COMMENT ON COLUMN public.subscription_tiers.discount_6_months IS
  'Discount percent (0–100) applied when billing every 6 months.';

COMMENT ON COLUMN public.subscription_tiers.discount_12_months IS
  'Discount percent (0–100) applied when billing every 12 months.';

COMMENT ON COLUMN public.subscription_tiers.limits IS
  'Numeric caps keyed by resource (students, courses, storage_mb, etc.).';

COMMENT ON COLUMN public.subscription_tiers.features IS
  'Enabled feature flags / modules as a JSON array.';

COMMENT ON COLUMN public.subscription_tiers.presents IS
  'Bundled perks or bonus items as a JSON array.';

COMMENT ON COLUMN public.subscription_tiers.is_active IS
  'When false, tier is hidden from new sign-ups but retained for existing orgs.';

COMMENT ON COLUMN public.subscription_tiers.priority_level IS
  'Sort order for plan pickers; higher values surface first.';

COMMIT;
