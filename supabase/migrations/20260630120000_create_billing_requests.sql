-- Billing checkout requests (card or bank transfer).

BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  tier_id text NOT NULL
    REFERENCES public.subscription_tiers (id) ON DELETE RESTRICT,
  period_months integer NOT NULL,
  amount_kopecks integer NOT NULL,
  payment_method text NOT NULL,
  unp text,
  company_name text,
  legal_address text,
  iban text,
  bic text,
  director_name text,
  director_position text,
  basis_of_authority text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_requests_period_months_chk
    CHECK (period_months = ANY (ARRAY[1, 3, 6, 12])),
  CONSTRAINT billing_requests_amount_kopecks_nonneg_chk
    CHECK (amount_kopecks >= 0),
  CONSTRAINT billing_requests_payment_method_chk
    CHECK (payment_method = ANY (ARRAY['card'::text, 'bank_transfer'::text])),
  CONSTRAINT billing_requests_status_chk
    CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])),
  CONSTRAINT billing_requests_bank_fields_chk
    CHECK (
      payment_method <> 'bank_transfer'::text
      OR (
        unp IS NOT NULL
        AND char_length(trim(unp)) > 0
        AND company_name IS NOT NULL
        AND char_length(trim(company_name)) > 0
        AND legal_address IS NOT NULL
        AND char_length(trim(legal_address)) > 0
        AND iban IS NOT NULL
        AND char_length(trim(iban)) > 0
        AND bic IS NOT NULL
        AND char_length(trim(bic)) > 0
        AND director_name IS NOT NULL
        AND char_length(trim(director_name)) > 0
        AND director_position IS NOT NULL
        AND char_length(trim(director_position)) > 0
        AND basis_of_authority IS NOT NULL
        AND char_length(trim(basis_of_authority)) > 0
      )
    )
);

CREATE INDEX IF NOT EXISTS billing_requests_organization_id_idx
  ON public.billing_requests (organization_id);

CREATE INDEX IF NOT EXISTS billing_requests_status_idx
  ON public.billing_requests (status);

COMMENT ON TABLE public.billing_requests IS
  'Checkout requests for subscription payment (card gateway or B2B bank invoice).';

COMMENT ON COLUMN public.billing_requests.iban IS
  'Расчётный счёт (IBAN) для счёта и акта.';

COMMENT ON COLUMN public.billing_requests.bic IS
  'Код банка (BIC) для счёта и акта.';

COMMENT ON COLUMN public.billing_requests.director_name IS
  'ФИО руководителя для подписи документов.';

COMMENT ON COLUMN public.billing_requests.director_position IS
  'Должность руководителя (директор и т.д.).';

COMMENT ON COLUMN public.billing_requests.basis_of_authority IS
  'Основание полномочий (Устав, доверенность и т.д.).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.billing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_requests_select ON public.billing_requests;
CREATE POLICY billing_requests_select
  ON public.billing_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = billing_requests.organization_id
        AND om.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

DROP POLICY IF EXISTS billing_requests_insert ON public.billing_requests;
CREATE POLICY billing_requests_insert
  ON public.billing_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = billing_requests.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.is_global_admin = true
    )
  );

DROP POLICY IF EXISTS billing_requests_update_admin ON public.billing_requests;
CREATE POLICY billing_requests_update_admin
  ON public.billing_requests
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

DROP POLICY IF EXISTS billing_requests_delete_admin ON public.billing_requests;
CREATE POLICY billing_requests_delete_admin
  ON public.billing_requests
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

GRANT ALL ON TABLE public.billing_requests TO anon;
GRANT ALL ON TABLE public.billing_requests TO authenticated;
GRANT ALL ON TABLE public.billing_requests TO service_role;

COMMIT;
