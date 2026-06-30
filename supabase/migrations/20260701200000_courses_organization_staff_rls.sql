-- Org staff (owner/curator) can manage all courses of their organization.
-- Complements legacy teacher_id-based policies for learning-center CRUD.

DROP POLICY IF EXISTS courses_select_org_staff ON public.courses;
CREATE POLICY courses_select_org_staff
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = courses.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS courses_insert_org_staff ON public.courses;
CREATE POLICY courses_insert_org_staff
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = courses.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS courses_update_org_staff ON public.courses;
CREATE POLICY courses_update_org_staff
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = courses.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = courses.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );

DROP POLICY IF EXISTS courses_delete_org_staff ON public.courses;
CREATE POLICY courses_delete_org_staff
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      WHERE om.organization_id = courses.organization_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
    )
  );
