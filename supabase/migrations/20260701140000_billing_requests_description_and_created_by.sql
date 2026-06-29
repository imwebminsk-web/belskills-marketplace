-- Billing request metadata: coupon link, creator, description, atomic coupon usage.
-- coupon_id MUST be added before any index/policy referencing it (see 20260701130000).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columns (coupon_id first — indexes below depend on it)
-- ---------------------------------------------------------------------------

ALTER TABLE public.billing_requests
  ADD COLUMN IF NOT EXISTS coupon_id uuid
    REFERENCES public.coupons (id) ON DELETE SET NULL;

ALTER TABLE public.billing_requests
  ADD COLUMN IF NOT EXISTS created_by uuid
    REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.billing_requests
  ADD COLUMN IF NOT EXISTS description text;

-- ---------------------------------------------------------------------------
-- 2. Indexes (only after all columns exist)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS billing_requests_coupon_id_idx
  ON public.billing_requests (coupon_id)
  WHERE coupon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_requests_created_by_pending_idx
  ON public.billing_requests (created_by)
  WHERE status = 'pending'::text;

CREATE INDEX IF NOT EXISTS billing_requests_org_pending_idx
  ON public.billing_requests (organization_id)
  WHERE status = 'pending'::text;

CREATE INDEX IF NOT EXISTS billing_requests_created_by_coupon_idx
  ON public.billing_requests (created_by, coupon_id)
  WHERE coupon_id IS NOT NULL AND status <> 'cancelled'::text;

-- ---------------------------------------------------------------------------
-- 3. Comments
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.billing_requests.coupon_id IS
  'Applied promo coupon at checkout; amount_kopecks reflects the discount.';

COMMENT ON COLUMN public.billing_requests.created_by IS
  'User who initiated checkout; used for per-user promo limits.';

COMMENT ON COLUMN public.billing_requests.description IS
  'Invoice line description including optional promo code suffix.';

-- ---------------------------------------------------------------------------
-- 4. Functions (no billing_requests.coupon_id dependency here)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_coupon_used_count(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_coupon_used_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) TO service_role;

COMMIT;
