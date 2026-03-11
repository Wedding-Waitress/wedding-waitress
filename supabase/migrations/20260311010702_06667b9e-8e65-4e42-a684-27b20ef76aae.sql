ALTER TABLE place_card_settings 
  ADD COLUMN IF NOT EXISTS guest_name_rotation numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS table_seat_rotation numeric NOT NULL DEFAULT 0;