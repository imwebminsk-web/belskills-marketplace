-- Promo coupons: fixed or percentage discounts with usage limits and expiration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_code_unique UNIQUE (code),
  CONSTRAINT coupons_discount_type_chk
    CHECK (discount_type = ANY (ARRAY['percent'::text, 'fixed'::text])),
  CONSTRAINT coupons_discount_value_positive_chk
    CHECK (discount_value > 0),
  CONSTRAINT coupons_used_count_nonneg_chk
    CHECK (used_count >= 0),
  CONSTRAINT coupons_max_uses_positive_chk
    CHECK (max_uses IS NULL OR max_uses > 0)
);

CREATE INDEX IF NOT EXISTS coupons_code_idx
  ON public.coupons (code);

CREATE INDEX IF NOT EXISTS coupons_is_active_idx
  ON public.coupons (is_active)
  WHERE is_active = true;

COMMENT ON TABLE public.coupons IS
  'Promotional discount codes for checkout (fixed amount or percentage).';

COMMENT ON COLUMN public.coupons.name IS
  'Admin-facing description of the coupon.';

COMMENT ON COLUMN public.coupons.code IS
  'Promo code entered at checkout (e.g. START2026).';

COMMENT ON COLUMN public.coupons.discount_type IS
  'percent — percentage off; fixed — fixed amount off.';

COMMENT ON COLUMN public.coupons.discount_value IS
  'Discount amount: percent (1–100) or fixed monetary value depending on discount_type.';

COMMENT ON COLUMN public.coupons.max_uses IS
  'Maximum redemptions; NULL means unlimited.';

COMMENT ON COLUMN public.coupons.used_count IS
  'Number of times this coupon has been redeemed.';

COMMENT ON COLUMN public.coupons.expires_at IS
  'Optional expiration timestamp; NULL means no expiry.';

COMMENT ON COLUMN public.coupons.is_active IS
  'Inactive coupons are hidden from public read and cannot be applied at checkout.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupons_select_active ON public.coupons;
CREATE POLICY coupons_select_active
  ON public.coupons
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS coupons_select_admin ON public.coupons;
CREATE POLICY coupons_select_admin
  ON public.coupons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

DROP POLICY IF EXISTS coupons_insert_admin ON public.coupons;
CREATE POLICY coupons_insert_admin
  ON public.coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

DROP POLICY IF EXISTS coupons_update_admin ON public.coupons;
CREATE POLICY coupons_update_admin
  ON public.coupons
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

DROP POLICY IF EXISTS coupons_delete_admin ON public.coupons;
CREATE POLICY coupons_delete_admin
  ON public.coupons
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

GRANT ALL ON TABLE public.coupons TO anon;
GRANT ALL ON TABLE public.coupons TO authenticated;
GRANT ALL ON TABLE public.coupons TO service_role;

COMMIT;
