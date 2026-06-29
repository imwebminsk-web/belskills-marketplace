-- Public showcase profiles and branch locations for learning centers (catalog cards).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  public_name text NOT NULL,
  short_description text,
  full_description text,
  logo_url text,
  website text,
  email text,
  phone_main text,
  messengers jsonb NOT NULL DEFAULT '{}'::jsonb,
  advantages text[] NOT NULL DEFAULT '{}'::text[],
  rating_avg numeric NOT NULL DEFAULT 5.0,
  reviews_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_profiles_organization_id_unique UNIQUE (organization_id),
  CONSTRAINT organization_profiles_public_name_nonempty_chk
    CHECK (char_length(trim(public_name)) > 0),
  CONSTRAINT organization_profiles_short_description_len_chk
    CHECK (
      short_description IS NULL
      OR char_length(short_description) <= 150
    ),
  CONSTRAINT organization_profiles_rating_avg_range_chk
    CHECK (rating_avg >= 0 AND rating_avg <= 5),
  CONSTRAINT organization_profiles_reviews_count_nonneg_chk
    CHECK (reviews_count >= 0)
);

CREATE INDEX IF NOT EXISTS organization_profiles_organization_id_idx
  ON public.organization_profiles (organization_id);

COMMENT ON TABLE public.organization_profiles IS
  'Public showcase card and profile page content for a learning center.';

COMMENT ON COLUMN public.organization_profiles.short_description IS
  'Up to 150 characters for catalog listing cards.';

COMMENT ON COLUMN public.organization_profiles.full_description IS
  'Detailed markdown or plain text for the public profile page.';

COMMENT ON COLUMN public.organization_profiles.messengers IS
  'Contact messengers JSON, e.g. {"viber":"","whatsapp":"","telegram":""}.';

COMMENT ON COLUMN public.organization_profiles.advantages IS
  'Bullet points highlighting the center on catalog cards.';

CREATE TABLE IF NOT EXISTS public.organization_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  city text NOT NULL,
  address text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_branches_city_nonempty_chk
    CHECK (char_length(trim(city)) > 0),
  CONSTRAINT organization_branches_address_nonempty_chk
    CHECK (char_length(trim(address)) > 0)
);

CREATE INDEX IF NOT EXISTS organization_branches_organization_id_idx
  ON public.organization_branches (organization_id);

COMMENT ON TABLE public.organization_branches IS
  'Physical branch locations displayed on the organization showcase profile.';

COMMENT ON COLUMN public.organization_branches.label IS
  'Optional display label, e.g. "Главный офис", "Филиал на Немиге".';

-- ---------------------------------------------------------------------------
-- 2. Auto-create profile when a new organization is registered
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_organization_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_profiles (organization_id, public_name)
  VALUES (NEW.id, NEW.name)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created_profile ON public.organizations;

CREATE TRIGGER on_organization_created_profile
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization_profile();

-- Backfill profiles for organizations created before this migration.
INSERT INTO public.organization_profiles (organization_id, public_name)
SELECT o.id, o.name
FROM public.organizations AS o
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_profiles AS p
  WHERE p.organization_id = o.id
);

-- ---------------------------------------------------------------------------
-- 3. RLS — organization_profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_profiles_select_public ON public.organization_profiles;
CREATE POLICY organization_profiles_select_public
  ON public.organization_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS organization_profiles_insert_staff ON public.organization_profiles;
CREATE POLICY organization_profiles_insert_staff
  ON public.organization_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_profiles.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS organization_profiles_update_staff ON public.organization_profiles;
CREATE POLICY organization_profiles_update_staff
  ON public.organization_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_profiles.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_profiles.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS organization_profiles_all_admin ON public.organization_profiles;
CREATE POLICY organization_profiles_all_admin
  ON public.organization_profiles
  FOR ALL
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

-- ---------------------------------------------------------------------------
-- 4. RLS — organization_branches
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_branches_select_public ON public.organization_branches;
CREATE POLICY organization_branches_select_public
  ON public.organization_branches
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS organization_branches_insert_staff ON public.organization_branches;
CREATE POLICY organization_branches_insert_staff
  ON public.organization_branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_branches.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS organization_branches_update_staff ON public.organization_branches;
CREATE POLICY organization_branches_update_staff
  ON public.organization_branches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_branches.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_branches.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS organization_branches_delete_staff ON public.organization_branches;
CREATE POLICY organization_branches_delete_staff
  ON public.organization_branches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_branches.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS organization_branches_all_admin ON public.organization_branches;
CREATE POLICY organization_branches_all_admin
  ON public.organization_branches
  FOR ALL
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

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------

GRANT ALL ON TABLE public.organization_profiles TO anon;
GRANT ALL ON TABLE public.organization_profiles TO authenticated;
GRANT ALL ON TABLE public.organization_profiles TO service_role;

GRANT ALL ON TABLE public.organization_branches TO anon;
GRANT ALL ON TABLE public.organization_branches TO authenticated;
GRANT ALL ON TABLE public.organization_branches TO service_role;

COMMIT;
