-- Remove legacy courses.teacher_id and lessons.type/content; migrate RLS to organization staff.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper functions (org-scoped course access)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_org_staff(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
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

COMMENT ON FUNCTION public.is_course_org_staff(uuid) IS
  'True when auth user is global admin or owner/curator of the course organization.';

-- ---------------------------------------------------------------------------
-- 2. Drop legacy courses policies (teacher_id)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS courses_delete_own ON public.courses;
DROP POLICY IF EXISTS courses_insert_teacher_or_admin ON public.courses;
DROP POLICY IF EXISTS courses_update_own ON public.courses;

DROP POLICY IF EXISTS courses_select_visible ON public.courses;
CREATE POLICY courses_select_visible
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'::public.course_status
    OR (
      auth.uid() IS NOT NULL
      AND public.is_course_org_staff(id)
    )
  );

DROP POLICY IF EXISTS courses_insert_org_staff ON public.courses;
CREATE POLICY courses_insert_org_staff
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (
      organization_id IS NOT NULL
      AND public.is_org_staff(organization_id)
    )
  );

DROP POLICY IF EXISTS courses_update_org_staff ON public.courses;
CREATE POLICY courses_update_org_staff
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.is_course_org_staff(id))
  WITH CHECK (public.is_course_org_staff(id));

DROP POLICY IF EXISTS courses_delete_org_staff ON public.courses;
CREATE POLICY courses_delete_org_staff
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (public.is_course_org_staff(id));

-- ---------------------------------------------------------------------------
-- 3. Modules, lessons, lesson_blocks — org staff policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS modules_delete_owner ON public.modules;
CREATE POLICY modules_delete_org_staff
  ON public.modules
  FOR DELETE
  TO authenticated
  USING (public.is_course_org_staff(course_id));

DROP POLICY IF EXISTS modules_insert_owner ON public.modules;
CREATE POLICY modules_insert_org_staff
  ON public.modules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_course_org_staff(course_id));

DROP POLICY IF EXISTS modules_select_visible ON public.modules;
CREATE POLICY modules_select_visible
  ON public.modules
  FOR SELECT
  TO anon, authenticated
  USING (
    public.is_course_org_staff(course_id)
    OR EXISTS (
      SELECT 1
      FROM public.courses AS c
      WHERE c.id = modules.course_id
        AND c.status = 'published'::public.course_status
    )
  );

DROP POLICY IF EXISTS modules_update_owner ON public.modules;
CREATE POLICY modules_update_org_staff
  ON public.modules
  FOR UPDATE
  TO authenticated
  USING (public.is_course_org_staff(course_id))
  WITH CHECK (public.is_course_org_staff(course_id));

DROP POLICY IF EXISTS lessons_delete_owner ON public.lessons;
CREATE POLICY lessons_delete_org_staff
  ON public.lessons
  FOR DELETE
  TO authenticated
  USING (public.is_module_org_staff(module_id));

DROP POLICY IF EXISTS lessons_insert_owner ON public.lessons;
CREATE POLICY lessons_insert_org_staff
  ON public.lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_module_org_staff(module_id));

DROP POLICY IF EXISTS lessons_select_visible ON public.lessons;
CREATE POLICY lessons_select_visible
  ON public.lessons
  FOR SELECT
  TO anon, authenticated
  USING (
    public.is_module_org_staff(module_id)
    OR (
      is_published = true
      AND EXISTS (
        SELECT 1
        FROM public.modules AS m
        INNER JOIN public.courses AS c ON c.id = m.course_id
        WHERE m.id = lessons.module_id
          AND c.status = 'published'::public.course_status
      )
    )
  );

DROP POLICY IF EXISTS lessons_update_owner ON public.lessons;
CREATE POLICY lessons_update_org_staff
  ON public.lessons
  FOR UPDATE
  TO authenticated
  USING (public.is_module_org_staff(module_id))
  WITH CHECK (public.is_module_org_staff(module_id));

DROP POLICY IF EXISTS lesson_blocks_delete_teacher ON public.lesson_blocks;
CREATE POLICY lesson_blocks_delete_org_staff
  ON public.lesson_blocks
  FOR DELETE
  TO authenticated
  USING (public.is_lesson_org_staff(lesson_id));

DROP POLICY IF EXISTS lesson_blocks_insert_teacher ON public.lesson_blocks;
CREATE POLICY lesson_blocks_insert_org_staff
  ON public.lesson_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_lesson_org_staff(lesson_id));

DROP POLICY IF EXISTS lesson_blocks_select_visible ON public.lesson_blocks;
CREATE POLICY lesson_blocks_select_visible
  ON public.lesson_blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons AS l
      INNER JOIN public.modules AS m ON m.id = l.module_id
      INNER JOIN public.courses AS c ON c.id = m.course_id
      WHERE l.id = lesson_blocks.lesson_id
        AND (
          c.status = 'published'::public.course_status
          OR (
            auth.uid() IS NOT NULL
            AND public.is_course_org_staff(c.id)
          )
        )
    )
  );

DROP POLICY IF EXISTS lesson_blocks_update_teacher ON public.lesson_blocks;
CREATE POLICY lesson_blocks_update_org_staff
  ON public.lesson_blocks
  FOR UPDATE
  TO authenticated
  USING (public.is_lesson_org_staff(lesson_id))
  WITH CHECK (public.is_lesson_org_staff(lesson_id));

-- ---------------------------------------------------------------------------
-- 4. Enrollments, cohorts, related tables
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS enrollments_delete_teacher ON public.enrollments;
CREATE POLICY enrollments_delete_org_staff
  ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (public.is_course_org_staff(course_id));

DROP POLICY IF EXISTS enrollments_select_own_or_teacher ON public.enrollments;
CREATE POLICY enrollments_select_own_or_staff
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_course_org_staff(course_id)
  );

DROP POLICY IF EXISTS cohorts_delete_teacher ON public.cohorts;
CREATE POLICY cohorts_delete_org_staff
  ON public.cohorts
  FOR DELETE
  TO authenticated
  USING (public.is_course_org_staff(course_id));

DROP POLICY IF EXISTS cohorts_insert_teacher ON public.cohorts;
CREATE POLICY cohorts_insert_org_staff
  ON public.cohorts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_course_org_staff(course_id));

DROP POLICY IF EXISTS cohorts_select_teacher_or_member ON public.cohorts;
CREATE POLICY cohorts_select_staff_or_member
  ON public.cohorts
  FOR SELECT
  TO authenticated
  USING (
    public.is_course_org_staff(course_id)
    OR EXISTS (
      SELECT 1
      FROM public.enrollments AS e
      WHERE e.cohort_id = cohorts.id
        AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cohorts_update_teacher ON public.cohorts;
CREATE POLICY cohorts_update_org_staff
  ON public.cohorts
  FOR UPDATE
  TO authenticated
  USING (public.is_course_org_staff(course_id))
  WITH CHECK (public.is_course_org_staff(course_id));

DROP POLICY IF EXISTS cohort_assignments_delete_teacher ON public.cohort_assignments;
DROP POLICY IF EXISTS cohort_assignments_insert_teacher ON public.cohort_assignments;
DROP POLICY IF EXISTS cohort_assignments_select_teacher ON public.cohort_assignments;
DROP POLICY IF EXISTS cohort_assignments_update_teacher ON public.cohort_assignments;

CREATE POLICY cohort_assignments_delete_org_staff
  ON public.cohort_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cohorts AS ch
      WHERE ch.id = cohort_assignments.cohort_id
        AND public.is_course_org_staff(ch.course_id)
    )
  );

CREATE POLICY cohort_assignments_insert_org_staff
  ON public.cohort_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cohorts AS ch
      WHERE ch.id = cohort_assignments.cohort_id
        AND public.is_course_org_staff(ch.course_id)
    )
  );

CREATE POLICY cohort_assignments_select_org_staff
  ON public.cohort_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cohorts AS ch
      WHERE ch.id = cohort_assignments.cohort_id
        AND public.is_course_org_staff(ch.course_id)
    )
  );

CREATE POLICY cohort_assignments_update_org_staff
  ON public.cohort_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cohorts AS ch
      WHERE ch.id = cohort_assignments.cohort_id
        AND public.is_course_org_staff(ch.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cohorts AS ch
      WHERE ch.id = cohort_assignments.cohort_id
        AND public.is_course_org_staff(ch.course_id)
    )
  );

DROP POLICY IF EXISTS cohort_messages_delete_teacher ON public.cohort_messages;
CREATE POLICY cohort_messages_delete_org_staff
  ON public.cohort_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cohorts AS ch
      WHERE ch.id = cohort_messages.cohort_id
        AND public.is_course_org_staff(ch.course_id)
    )
  );

DROP POLICY IF EXISTS cohort_messages_insert_member ON public.cohort_messages;
CREATE POLICY cohort_messages_insert_member
  ON public.cohort_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.cohorts AS ch
        WHERE ch.id = cohort_messages.cohort_id
          AND public.is_course_org_staff(ch.course_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.enrollments AS e
        WHERE e.cohort_id = cohort_messages.cohort_id
          AND e.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS cohort_messages_select_member ON public.cohort_messages;
CREATE POLICY cohort_messages_select_member
  ON public.cohort_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cohorts AS ch
      WHERE ch.id = cohort_messages.cohort_id
        AND public.is_course_org_staff(ch.course_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.enrollments AS e
      WHERE e.cohort_id = cohort_messages.cohort_id
        AND e.user_id = auth.uid()
    )
  );

-- assignment_submissions (teacher branch → org staff)
DROP POLICY IF EXISTS assignment_submissions_select_teacher_or_admin ON public.assignment_submissions;
CREATE POLICY assignment_submissions_select_teacher_or_admin
  ON public.assignment_submissions
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.lesson_blocks AS lb
      INNER JOIN public.lessons AS l ON l.id = lb.lesson_id
      INNER JOIN public.modules AS m ON m.id = l.module_id
      WHERE lb.id = assignment_submissions.lesson_block_id
        AND public.is_course_org_staff(m.course_id)
    )
  );

DROP POLICY IF EXISTS assignment_submissions_update_teacher_or_admin ON public.assignment_submissions;
CREATE POLICY assignment_submissions_update_teacher_or_admin
  ON public.assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.lesson_blocks AS lb
      INNER JOIN public.lessons AS l ON l.id = lb.lesson_id
      INNER JOIN public.modules AS m ON m.id = l.module_id
      WHERE lb.id = assignment_submissions.lesson_block_id
        AND public.is_course_org_staff(m.course_id)
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.lesson_blocks AS lb
      INNER JOIN public.lessons AS l ON l.id = lb.lesson_id
      INNER JOIN public.modules AS m ON m.id = l.module_id
      WHERE lb.id = assignment_submissions.lesson_block_id
        AND public.is_course_org_staff(m.course_id)
    )
  );

DROP POLICY IF EXISTS lesson_completions_select_own_or_teacher ON public.lesson_completions;
CREATE POLICY lesson_completions_select_own_or_staff
  ON public.lesson_completions
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_platform_admin()
    OR public.is_lesson_org_staff(lesson_id)
  );

-- ---------------------------------------------------------------------------
-- 5. RPC functions that referenced teacher_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_cohort_student_emails(p_cohort_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cohorts AS ch
    WHERE ch.id = p_cohort_id
      AND public.is_course_org_staff(ch.course_id)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT e.user_id, u.email::text
  FROM public.enrollments AS e
  INNER JOIN auth.users AS u ON u.id = e.user_id
  WHERE e.cohort_id = p_cohort_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_users_emails(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT e.user_id, u.email::text
  FROM public.enrollments AS e
  INNER JOIN auth.users AS u ON u.id = e.user_id
  INNER JOIN public.courses AS c ON c.id = e.course_id
  WHERE e.user_id = ANY (p_user_ids)
    AND public.is_course_org_staff(c.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_pending_review_counts()
RETURNS TABLE(cohort_id uuid, pending_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.cohort_id,
    COUNT(s.id)::bigint AS pending_count
  FROM public.assignment_submissions AS s
  INNER JOIN public.lesson_blocks AS lb ON lb.id = s.lesson_block_id
  INNER JOIN public.lessons AS l ON l.id = lb.lesson_id
  INNER JOIN public.modules AS m ON m.id = l.module_id
  INNER JOIN public.courses AS c ON c.id = m.course_id
  INNER JOIN public.enrollments AS e
    ON e.user_id = s.student_id
    AND e.course_id = c.id
    AND e.cohort_id IS NOT NULL
  WHERE s.status = 'pending'::public.submission_status
    AND public.is_course_org_staff(c.id)
    AND COALESCE((lb.content->>'save_to_journal')::boolean, false) = true
  GROUP BY e.cohort_id;
$$;

-- ---------------------------------------------------------------------------
-- 6. Drop legacy columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.courses
  DROP COLUMN IF EXISTS teacher_id CASCADE;

ALTER TABLE public.lessons
  DROP COLUMN IF EXISTS content CASCADE;

ALTER TABLE public.lessons
  DROP COLUMN IF EXISTS type CASCADE;

COMMIT;
