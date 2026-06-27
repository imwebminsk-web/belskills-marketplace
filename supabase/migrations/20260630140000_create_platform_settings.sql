-- Singleton platform billing requisites for invoices and acts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer PRIMARY KEY DEFAULT 1,
  company_name varchar,
  unp varchar,
  legal_address text,
  iban varchar,
  bic varchar,
  director_name varchar,
  director_position varchar,
  basis_of_authority varchar,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton_chk CHECK (id = 1)
);

COMMENT ON TABLE public.platform_settings IS
  'Singleton row (id=1): legal and bank requisites of the platform for B2B billing documents.';

INSERT INTO public.platform_settings (id, company_name)
VALUES (1, 'BelSkills Platform')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_select ON public.platform_settings;
CREATE POLICY platform_settings_select
  ON public.platform_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS platform_settings_update_admin ON public.platform_settings;
CREATE POLICY platform_settings_update_admin
  ON public.platform_settings
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

GRANT ALL ON TABLE public.platform_settings TO anon;
GRANT ALL ON TABLE public.platform_settings TO authenticated;
GRANT ALL ON TABLE public.platform_settings TO service_role;

COMMIT;
