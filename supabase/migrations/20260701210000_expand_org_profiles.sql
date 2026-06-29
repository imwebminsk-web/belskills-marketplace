-- Expand organization showcase profiles for the new public school page design.

BEGIN;

ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS phones text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unp text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS gallery text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.organization_profiles.cover_url IS
  'Public hero/cover image URL for the school showcase page.';

COMMENT ON COLUMN public.organization_profiles.phones IS
  'Additional phone numbers displayed on the showcase (E.164 or local format).';

COMMENT ON COLUMN public.organization_profiles.social_links IS
  'Social network profile URLs, e.g. {"instagram":"…","telegram":"…","viber":"…"}.';

COMMENT ON COLUMN public.organization_profiles.unp IS
  'Belarus taxpayer identification number (УНП) for legal disclosure.';

COMMENT ON COLUMN public.organization_profiles.legal_name IS
  'Registered legal entity name of the learning center.';

COMMENT ON COLUMN public.organization_profiles.gallery IS
  'Public image gallery URLs for the showcase page.';

ALTER TABLE public.organization_branches
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.organization_branches.phone IS
  'Branch contact phone number.';

COMMIT;
