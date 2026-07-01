-- Rejection feedback for organization showcase moderation + cascade course visibility.

BEGIN;

ALTER TYPE public.organization_showcase_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.organization_profiles.rejection_reason IS
  'Admin feedback when showcase profile is rejected during moderation.';

-- Public catalog: hide courses when parent organization showcase is not published.
DROP POLICY IF EXISTS courses_select_visible ON public.courses;

CREATE POLICY courses_select_visible
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      status = 'published'::public.course_status
      AND organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_profiles AS op
        WHERE op.organization_id = courses.organization_id
          AND op.deleted_at IS NULL
          AND op.status = 'published'::public.organization_showcase_status
      )
    )
    OR (
      auth.uid() IS NOT NULL
      AND public.is_course_org_staff(id)
    )
  );

COMMIT;
