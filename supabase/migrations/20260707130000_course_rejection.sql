-- Course moderation lifecycle + admin RLS for global moderators.

BEGIN;

ALTER TYPE public.course_status ADD VALUE IF NOT EXISTS 'moderation';
ALTER TYPE public.course_status ADD VALUE IF NOT EXISTS 'hidden';
ALTER TYPE public.course_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.courses.rejection_reason IS
  'Admin feedback when a course is rejected during moderation.';

-- Global admins: read/update any course (moderation panel).
DROP POLICY IF EXISTS courses_admin_all_ops ON public.courses;
CREATE POLICY courses_admin_all_ops
  ON public.courses
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

COMMIT;
