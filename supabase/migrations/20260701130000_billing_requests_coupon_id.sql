-- Link billing requests to applied promo coupons.
-- NOTE: coupon_id column + index are also ensured in 20260701140000 (idempotent).

BEGIN;

ALTER TABLE public.billing_requests
  ADD COLUMN IF NOT EXISTS coupon_id uuid
    REFERENCES public.coupons (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS billing_requests_coupon_id_idx
  ON public.billing_requests (coupon_id)
  WHERE coupon_id IS NOT NULL;

COMMENT ON COLUMN public.billing_requests.coupon_id IS
  'Applied promo coupon at checkout; amount_kopecks reflects the discount.';

COMMIT;
