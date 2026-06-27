-- RLS for subscription_tiers: public read, global admins manage.

BEGIN;

-- Enable RLS
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- 1. Read access for everyone (Needed for the landing page and user dashboard)
CREATE POLICY "Allow public read access to subscription_tiers"
ON public.subscription_tiers FOR SELECT
USING (true);

-- 2. Admin access for INSERT
CREATE POLICY "Allow admins to insert subscription_tiers"
ON public.subscription_tiers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_global_admin = true
  )
);

-- 3. Admin access for UPDATE
CREATE POLICY "Allow admins to update subscription_tiers"
ON public.subscription_tiers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_global_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_global_admin = true
  )
);

-- 4. Admin access for DELETE
CREATE POLICY "Allow admins to delete subscription_tiers"
ON public.subscription_tiers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_global_admin = true
  )
);

COMMIT;
