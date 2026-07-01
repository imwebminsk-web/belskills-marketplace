-- Fix RLS infinite recursion: helper functions that read RLS-protected tables
-- must run as SECURITY DEFINER so policy checks do not re-enter the same table.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_org_staff(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.is_global_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_org_staff(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses AS c
      WHERE c.id = p_course_id
        AND c.organization_id IS NOT NULL
        AND public.is_org_staff(c.organization_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_module_org_staff(p_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modules AS m
    WHERE m.id = p_module_id
      AND public.is_course_org_staff(m.course_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_lesson_org_staff(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons AS l
    INNER JOIN public.modules AS m ON m.id = l.module_id
    WHERE l.id = p_lesson_id
      AND public.is_course_org_staff(m.course_id)
  );
$$;

COMMIT;
