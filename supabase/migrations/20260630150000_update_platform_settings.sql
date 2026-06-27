-- Add mailing address and signature/stamp image for printable invoices.

BEGIN;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS mailing_address text,
  ADD COLUMN IF NOT EXISTS signature_image_base64 text;

COMMENT ON COLUMN public.platform_settings.mailing_address IS
  'Почтовый адрес для счетов и актов (если отличается от юридического).';

COMMENT ON COLUMN public.platform_settings.signature_image_base64 IS
  'Data URL или base64 PNG/JPEG подписи и печати для печатных документов.';

COMMIT;
