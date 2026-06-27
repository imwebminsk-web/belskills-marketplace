-- Daily pg_cron job: downgrade expired organization tiers to 'free'.
-- Tenants live in public.organizations (UI "schools"). tier_expires_at is set in app on trial signup.
-- Schedule: 03:00 UTC every day (enable pg_cron in Supabase Dashboard → Database → Extensions if needed).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Expiry column on organizations
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz;

COMMENT ON COLUMN public.organizations.tier_expires_at IS
  'When tier_id expires; NULL for free tier or non-expiring paid plans.';

-- ---------------------------------------------------------------------------
-- 2. Downgrade target tier
-- ---------------------------------------------------------------------------

INSERT INTO public.subscription_tiers (id, name, limits)
VALUES ('free', 'Free', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. pg_cron + downgrade worker
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.downgrade_expired_tariffs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.organizations
  SET
    tier_id = 'free',
    tier_expires_at = NULL
  WHERE tier_expires_at IS NOT NULL
    AND tier_expires_at < now();
END;
$$;

COMMENT ON FUNCTION public.downgrade_expired_tariffs() IS
  'Moves organizations past tier_expires_at to the free tier. Invoked daily by pg_cron.';

REVOKE ALL ON FUNCTION public.downgrade_expired_tariffs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.downgrade_expired_tariffs() TO postgres;

-- Replace existing job on re-apply (idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'downgrade_expired_tariffs_job'
  ) THEN
    PERFORM cron.unschedule('downgrade_expired_tariffs_job');
  END IF;
END;
$$;

SELECT cron.schedule(
  'downgrade_expired_tariffs_job',
  '0 3 * * *',
  $$SELECT public.downgrade_expired_tariffs()$$
);

COMMIT;
