-- Moderation state machine and soft delete for organization showcase profiles.

BEGIN;

CREATE TYPE public.organization_showcase_status AS ENUM (
  'draft',
  'moderation',
  'published',
  'hidden',
  'blocked'
);

ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS status public.organization_showcase_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.organization_profiles.status IS
  'Showcase lifecycle: draft → moderation → published; hidden toggles visibility without re-moderation; blocked by admin.';

COMMENT ON COLUMN public.organization_profiles.deleted_at IS
  'Soft delete timestamp. When set, profile is hidden from staff UI and catalog.';

CREATE INDEX IF NOT EXISTS organization_profiles_status_idx
  ON public.organization_profiles (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS organization_profiles_deleted_at_idx
  ON public.organization_profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Public catalog: only published, non-deleted profiles.
DROP POLICY IF EXISTS organization_profiles_select_public ON public.organization_profiles;

CREATE POLICY organization_profiles_select_public
  ON public.organization_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND status = 'published'::public.organization_showcase_status
  );

-- Staff can read their own org profile in any status (including deleted).
DROP POLICY IF EXISTS organization_profiles_select_staff ON public.organization_profiles;

CREATE POLICY organization_profiles_select_staff
  ON public.organization_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_profiles.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

COMMIT;
