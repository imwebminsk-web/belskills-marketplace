-- Public storage bucket for organization showcase logos.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880,
  ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.storage_logo_path_allowed(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    split_part(object_path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      EXISTS (
        SELECT 1
        FROM public.organization_members AS om
        WHERE om.organization_id = split_part(object_path, '/', 1)::uuid
          AND om.user_id = auth.uid()
          AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.is_global_admin = true
      )
    );
$$;

DROP POLICY IF EXISTS logos_public_read ON storage.objects;
CREATE POLICY logos_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS logos_staff_insert ON storage.objects;
CREATE POLICY logos_staff_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND public.storage_logo_path_allowed(name)
  );

DROP POLICY IF EXISTS logos_staff_update ON storage.objects;
CREATE POLICY logos_staff_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND public.storage_logo_path_allowed(name)
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND public.storage_logo_path_allowed(name)
  );

DROP POLICY IF EXISTS logos_staff_delete ON storage.objects;
CREATE POLICY logos_staff_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND public.storage_logo_path_allowed(name)
  );

COMMIT;
