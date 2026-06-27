-- Sequential invoice numbers for billing_requests (accounting).

BEGIN;

ALTER TABLE public.billing_requests
  ADD COLUMN IF NOT EXISTS invoice_number SERIAL;

COMMENT ON COLUMN public.billing_requests.invoice_number IS
  'Auto-incrementing sequential invoice number for printed documents.';

COMMIT;
