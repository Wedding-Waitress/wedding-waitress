ALTER TABLE public.dietary_chart_settings
  ADD COLUMN IF NOT EXISTS guest_name_color text NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS guest_list_color text NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS dietary_color text NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS show_guest_names boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_guest_list boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_dietary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_seat_numbers boolean NOT NULL DEFAULT true;
