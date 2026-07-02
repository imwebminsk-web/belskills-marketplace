ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lessons.is_demo IS
  'Demo lesson flag for catalog-tier plans (limited preview content).';
