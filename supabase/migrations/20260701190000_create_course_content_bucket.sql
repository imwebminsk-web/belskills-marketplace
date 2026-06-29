-- Public storage bucket for TipTap editor images (courses, org profiles, etc.).

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-content',
  'course-content',
  true,
  2097152,
  ARRAY[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text,
    'image/gif'::text
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.storage_course_content_path_owned(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    split_part(object_path, '/', 1) = auth.uid()::text
    AND split_part(object_path, '/', 2) = 'editor';
$$;

DROP POLICY IF EXISTS course_content_public_read ON storage.objects;
CREATE POLICY course_content_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'course-content');

DROP POLICY IF EXISTS course_content_owner_insert ON storage.objects;
CREATE POLICY course_content_owner_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-content'
    AND public.storage_course_content_path_owned(name)
  );

DROP POLICY IF EXISTS course_content_owner_update ON storage.objects;
CREATE POLICY course_content_owner_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-content'
    AND public.storage_course_content_path_owned(name)
  )
  WITH CHECK (
    bucket_id = 'course-content'
    AND public.storage_course_content_path_owned(name)
  );

DROP POLICY IF EXISTS course_content_owner_delete ON storage.objects;
CREATE POLICY course_content_owner_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-content'
    AND public.storage_course_content_path_owned(name)
  );

COMMIT;
