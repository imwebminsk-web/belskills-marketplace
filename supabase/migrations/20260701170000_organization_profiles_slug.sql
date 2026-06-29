-- Public URL slug for organization showcase profiles.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_org_slug(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    both '-'
    FROM regexp_replace(
      regexp_replace(lower(coalesce(raw, '')), '[^a-z0-9]+', '-', 'g'),
      '-+',
      '-',
      'g'
    )
  );
$$;

ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS slug text;

COMMENT ON COLUMN public.organization_profiles.slug IS
  'Unique public URL segment for /school/[slug]. Lowercase letters, digits, hyphens only.';

WITH candidates AS (
  SELECT
    op.id,
    op.organization_id,
    op.created_at,
    COALESCE(
      NULLIF(public.normalize_org_slug(op.public_name), ''),
      'school-' || left(replace(op.organization_id::text, '-', ''), 12)
    ) AS base_slug
  FROM public.organization_profiles AS op
  WHERE op.slug IS NULL
),
numbered AS (
  SELECT
    c.id,
    CASE
      WHEN count(*) OVER (PARTITION BY c.base_slug) = 1 THEN c.base_slug
      ELSE c.base_slug || '-' || row_number() OVER (
        PARTITION BY c.base_slug
        ORDER BY c.created_at, c.organization_id
      )::text
    END AS next_slug
  FROM candidates AS c
)
UPDATE public.organization_profiles AS op
SET slug = n.next_slug
FROM numbered AS n
WHERE op.id = n.id
  AND op.slug IS NULL;

UPDATE public.organization_profiles
SET slug = 'school-' || left(replace(organization_id::text, '-', ''), 12)
WHERE slug IS NULL OR trim(slug) = '';

ALTER TABLE public.organization_profiles
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.organization_profiles
  DROP CONSTRAINT IF EXISTS organization_profiles_slug_format_chk;

ALTER TABLE public.organization_profiles
  ADD CONSTRAINT organization_profiles_slug_format_chk
  CHECK (slug ~ '^[a-z0-9-]+$');

CREATE UNIQUE INDEX IF NOT EXISTS organization_profiles_slug_unique_idx
  ON public.organization_profiles (slug);

CREATE INDEX IF NOT EXISTS organization_profiles_slug_idx
  ON public.organization_profiles (slug);

CREATE OR REPLACE FUNCTION public.handle_new_organization_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
BEGIN
  v_base_slug := COALESCE(
    NULLIF(public.normalize_org_slug(NEW.name), ''),
    'school-' || left(replace(NEW.id::text, '-', ''), 12)
  );

  v_slug := v_base_slug;

  WHILE EXISTS (
    SELECT 1
    FROM public.organization_profiles AS p
    WHERE p.slug = v_slug
  ) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.organization_profiles (organization_id, public_name, slug)
  VALUES (NEW.id, NEW.name, v_slug)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;
