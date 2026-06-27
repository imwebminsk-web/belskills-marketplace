-- Allow global admins to insert subscription_history with action_type = purchase
-- (required when approving B2B billing requests on behalf of client orgs).

BEGIN;

DROP POLICY IF EXISTS subscription_history_insert_purchase ON public.subscription_history;

CREATE POLICY subscription_history_insert_purchase
  ON public.subscription_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    action_type = 'purchase'::public.subscription_action_type
    AND (
      EXISTS (
        SELECT 1
        FROM public.organization_members AS om
        WHERE om.organization_id = subscription_history.organization_id
          AND om.user_id = auth.uid()
          AND om.role = ANY (ARRAY['owner'::text, 'curator'::text])
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.is_global_admin = true
      )
    )
  );

COMMIT;
