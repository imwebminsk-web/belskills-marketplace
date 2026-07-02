-- Corporate tenant type and employee-to-employer profile link.

BEGIN;

CREATE TYPE public.organization_type AS ENUM ('school', 'corporate');

ALTER TABLE public.organizations
  ADD COLUMN org_type public.organization_type NOT NULL DEFAULT 'school';

ALTER TABLE public.profiles
  ADD COLUMN employer_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL;

COMMIT;
