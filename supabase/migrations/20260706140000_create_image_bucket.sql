-- Public bucket for course cover images and landing gallery (course-covers).

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-covers',
  'course-covers',
  true,
  5242880,
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

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-covers');

DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course-covers');

COMMIT;
