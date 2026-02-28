ALTER TABLE place_card_settings
  ADD COLUMN guest_name_offset_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN guest_name_offset_y numeric NOT NULL DEFAULT 0,
  ADD COLUMN table_offset_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN table_offset_y numeric NOT NULL DEFAULT 0,
  ADD COLUMN seat_offset_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN seat_offset_y numeric NOT NULL DEFAULT 0;