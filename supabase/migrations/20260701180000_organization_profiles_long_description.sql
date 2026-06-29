-- Long HTML description for the public organization profile page.

BEGIN;

ALTER TABLE public.organization_profiles
  ADD COLUMN IF NOT EXISTS long_description text;

COMMENT ON COLUMN public.organization_profiles.long_description IS
  'TipTap HTML for the detailed public school profile page.';

COMMIT;
