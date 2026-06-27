-- Context-Based Access foundation (public schema only).
-- Profile creation on signup is handled in auth-actions.ts (service_role), not via auth.users trigger.
-- Replaces unapplied 20260626000000–000002 multi-tenant migrations.
-- RLS and app-layer refactors are intentionally deferred to later steps.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PROFILES UPDATE
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_global_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_global_admin IS
  'Platform-wide super-admin flag. Legacy profiles.role is retained for backward compatibility.';

-- ---------------------------------------------------------------------------
-- 2. SUBSCRIPTION TIERS (SaaS model)
-- ---------------------------------------------------------------------------

CREATE TABLE public.subscription_tiers (
  id text PRIMARY KEY,
  name text NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT subscription_tiers_name_nonempty_chk
    CHECK (char_length(trim(name)) > 0)
);

COMMENT ON TABLE public.subscription_tiers IS
  'SaaS plan catalog (trial, basic, pro, premium). limits holds feature caps as JSON.';

INSERT INTO public.subscription_tiers (id, name, limits)
VALUES
  ('trial', 'Trial', '{}'::jsonb),
  ('basic', 'Basic', '{}'::jsonb),
  ('pro', 'Pro', '{}'::jsonb),
  ('premium', 'Premium', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. ORGANIZATIONS (contexts)
-- ---------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier_id text REFERENCES public.subscription_tiers (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_name_nonempty_chk
    CHECK (char_length(trim(name)) > 0)
);

COMMENT ON TABLE public.organizations IS
  'Tenant context (school / author). Elevated rights are scoped via organization_members.';

COMMENT ON COLUMN public.organizations.tier_id IS
  'Current SaaS subscription tier for this organization.';

-- ---------------------------------------------------------------------------
-- 4. ORGANIZATION MEMBERS (owners & curators only)
-- ---------------------------------------------------------------------------

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles (id) ON DELETE CASCADE,
  role text NOT NULL,
  PRIMARY KEY (organization_id, user_id),
  CONSTRAINT organization_members_role_chk CHECK (
    role = ANY (ARRAY['owner'::text, 'curator'::text])
  )
);

CREATE INDEX organization_members_user_id_idx
  ON public.organization_members (user_id);

COMMENT ON TABLE public.organization_members IS
  'Org-scoped staff membership. Students are not stored here; they use enrollments.';

-- ---------------------------------------------------------------------------
-- 5. ENROLLMENTS (students) — additive column only
-- ---------------------------------------------------------------------------

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

COMMENT ON COLUMN public.enrollments.activated_at IS
  'When course access became active (purchase, manual activation, etc.). Legacy enrolled_at is unchanged.';

-- ---------------------------------------------------------------------------
-- 6. COURSES → ORGANIZATIONS (teacher_id retained for frontend compatibility)
-- ---------------------------------------------------------------------------

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_organization_id_fkey;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS courses_organization_id_idx
  ON public.courses (organization_id);

COMMENT ON COLUMN public.courses.organization_id IS
  'Owning organization. teacher_id is legacy and will be removed in a later phase.';

-- ---------------------------------------------------------------------------
-- Grants (match existing public schema pattern; RLS in a later migration)
-- ---------------------------------------------------------------------------

GRANT ALL ON TABLE public.subscription_tiers TO anon;
GRANT ALL ON TABLE public.subscription_tiers TO authenticated;
GRANT ALL ON TABLE public.subscription_tiers TO service_role;

GRANT ALL ON TABLE public.organizations TO anon;
GRANT ALL ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;

GRANT ALL ON TABLE public.organization_members TO anon;
GRANT ALL ON TABLE public.organization_members TO authenticated;
GRANT ALL ON TABLE public.organization_members TO service_role;

COMMIT;
