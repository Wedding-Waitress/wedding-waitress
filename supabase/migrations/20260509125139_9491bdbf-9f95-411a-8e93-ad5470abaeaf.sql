ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS mailing_address text,
  ADD COLUMN IF NOT EXISTS mailing_suburb text,
  ADD COLUMN IF NOT EXISTS mailing_state text,
  ADD COLUMN IF NOT EXISTS mailing_postcode text,
  ADD COLUMN IF NOT EXISTS address_received boolean NOT NULL DEFAULT false;