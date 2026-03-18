ALTER TABLE public.place_card_settings
  ADD COLUMN message_font_family text NOT NULL DEFAULT 'Beauty Mountains',
  ADD COLUMN message_font_size integer NOT NULL DEFAULT 16,
  ADD COLUMN message_font_color text NOT NULL DEFAULT '#000000',
  ADD COLUMN message_bold boolean NOT NULL DEFAULT false,
  ADD COLUMN message_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN message_underline boolean NOT NULL DEFAULT false;