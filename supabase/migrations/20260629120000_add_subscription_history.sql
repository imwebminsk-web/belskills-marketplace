-- Subscription transaction log + trigger to derive organizations.tier_expires_at.
-- tier_expires_at is no longer set by application code; insert into subscription_history instead.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Action enum
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE public.subscription_action_type AS ENUM (
    'purchase',
    'upgrade',
    'manual_adjustment'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

COMMENT ON TYPE public.subscription_action_type IS
  'How subscription days were added: purchase, tier upgrade, or admin manual adjustment.';

-- ---------------------------------------------------------------------------
-- 2. History table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  tier_id text NOT NULL
    REFERENCES public.subscription_tiers (id) ON DELETE RESTRICT,
  days_added integer NOT NULL,
  action_type public.subscription_action_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_history_days_added_nonneg_chk
    CHECK (days_added >= 0)
);

CREATE INDEX IF NOT EXISTS subscription_history_organization_id_idx
  ON public.subscription_history (organization_id);

CREATE INDEX IF NOT EXISTS subscription_history_organization_created_idx
  ON public.subscription_history (organization_id, created_at DESC);

COMMENT ON TABLE public.subscription_history IS
  'Immutable log of subscription day grants; trigger recalculates organizations.tier_expires_at.';

COMMENT ON COLUMN public.subscription_history.days_added IS
  'Days credited by this transaction (summed with siblings for expiry).';

-- ---------------------------------------------------------------------------
-- 3. Tier weights (Basic=1, Pro=3, Premium=5)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.subscription_tier_weight(p_tier_id text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_tier_id
    WHEN 'basic' THEN 1
    WHEN 'pro' THEN 3
    WHEN 'premium' THEN 5
    WHEN 'trial' THEN 1
    WHEN 'free' THEN 0
    ELSE 1
  END;
$$;

COMMENT ON FUNCTION public.subscription_tier_weight(text) IS
  'Relative plan weight for upgrade proration (Basic=1, Pro=3, Premium=5).';

-- ---------------------------------------------------------------------------
-- 4. Trigger: recompute tier_id + tier_expires_at on each history insert
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_org_subscription_end_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_days integer;
  v_effective_tier text;
BEGIN
  SELECT COALESCE(SUM(sh.days_added), 0)
  INTO v_total_days
  FROM public.subscription_history AS sh
  WHERE sh.organization_id = NEW.organization_id;

  v_effective_tier := NEW.tier_id;

  UPDATE public.organizations AS o
  SET
    tier_id = v_effective_tier,
    tier_expires_at = CASE
      WHEN v_total_days <= 0
        OR v_effective_tier = 'free'
        OR public.subscription_tier_weight(v_effective_tier) = 0
      THEN NULL
      ELSE now() + (v_total_days || ' days')::interval
    END
  WHERE o.id = NEW.organization_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_org_subscription_end_date() IS
  'After subscription_history INSERT: tier_expires_at = now() + SUM(days_added); tier_id = NEW.tier_id.';

DROP TRIGGER IF EXISTS update_org_subscription_end_date
  ON public.subscription_history;

CREATE TRIGGER update_org_subscription_end_date
  AFTER INSERT ON public.subscription_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_subscription_end_date();

COMMENT ON COLUMN public.organizations.tier_expires_at IS
  'Derived from subscription_history via update_org_subscription_end_date trigger; do not set in app code.';

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_history_select ON public.subscription_history;
CREATE POLICY subscription_history_select
  ON public.subscription_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = subscription_history.organization_id
        AND om.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

DROP POLICY IF EXISTS subscription_history_insert_purchase ON public.subscription_history;
CREATE POLICY subscription_history_insert_purchase
  ON public.subscription_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    action_type = 'purchase'::public.subscription_action_type
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = subscription_history.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS subscription_history_insert_upgrade ON public.subscription_history;
CREATE POLICY subscription_history_insert_upgrade
  ON public.subscription_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    action_type = 'upgrade'::public.subscription_action_type
    AND (
      EXISTS (
        SELECT 1
        FROM public.organization_members AS om
        WHERE om.organization_id = subscription_history.organization_id
          AND om.user_id = auth.uid()
          AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.is_global_admin = true
      )
    )
  );

DROP POLICY IF EXISTS subscription_history_insert_manual ON public.subscription_history;
CREATE POLICY subscription_history_insert_manual
  ON public.subscription_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    action_type = 'manual_adjustment'::public.subscription_action_type
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------

GRANT ALL ON TABLE public.subscription_history TO anon;
GRANT ALL ON TABLE public.subscription_history TO authenticated;
GRANT ALL ON TABLE public.subscription_history TO service_role;

COMMIT;
