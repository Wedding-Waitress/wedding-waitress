ALTER TABLE public.invitation_card_settings
  ADD COLUMN card_type text NOT NULL DEFAULT 'invitation',
  ADD COLUMN name text NOT NULL DEFAULT 'Untitled';