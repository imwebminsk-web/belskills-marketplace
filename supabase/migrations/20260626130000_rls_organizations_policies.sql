-- RLS policies for organizations onboarding (createTrialOrganization via authenticated client).

BEGIN;

-- Explicitly enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS POLICIES
-- 1. Allow authenticated users to create a school
CREATE POLICY "Users can create organizations"
ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Allow authenticated users to view schools (Needed for the RETURNING clause)
CREATE POLICY "Users can view organizations"
ON public.organizations FOR SELECT TO authenticated USING (true);

-- ORGANIZATION MEMBERS POLICIES
-- 1. Allow users to insert their own membership (Needed to become 'owner' upon creation)
CREATE POLICY "Users can insert own membership"
ON public.organization_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 2. Allow users to view their own memberships
CREATE POLICY "Users can view own memberships"
ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid());

COMMIT;
