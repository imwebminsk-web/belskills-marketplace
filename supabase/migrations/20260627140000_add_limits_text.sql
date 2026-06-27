-- Marketing-friendly limits for public tariff showcase (separate from technical `limits` JSON).

BEGIN;

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS limits_text jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.subscription_tiers.limits_text IS
  'Human-readable limit bullets for pricing cards (JSON string array).';

COMMIT;
