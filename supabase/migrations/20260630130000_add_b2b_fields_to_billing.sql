-- Additive B2B fields for Belarusian bank invoices (safe if columns already exist).

BEGIN;

ALTER TABLE public.billing_requests
  ADD COLUMN IF NOT EXISTS iban varchar,
  ADD COLUMN IF NOT EXISTS bic varchar,
  ADD COLUMN IF NOT EXISTS director_name varchar,
  ADD COLUMN IF NOT EXISTS director_position varchar,
  ADD COLUMN IF NOT EXISTS basis_of_authority varchar;

COMMENT ON COLUMN public.billing_requests.iban IS
  'Расчётный счёт (IBAN) для счёта и акта.';

COMMENT ON COLUMN public.billing_requests.bic IS
  'Код банка (BIC) для счёта и акта.';

COMMENT ON COLUMN public.billing_requests.director_name IS
  'ФИО руководителя для подписи документов.';

COMMENT ON COLUMN public.billing_requests.director_position IS
  'Должность руководителя (директор и т.д.).';

COMMENT ON COLUMN public.billing_requests.basis_of_authority IS
  'Основание полномочий (Устав, доверенность и т.д.).';

COMMIT;
