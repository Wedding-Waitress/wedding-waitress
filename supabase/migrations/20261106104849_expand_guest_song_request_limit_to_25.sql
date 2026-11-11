-- Expand configurable song requests while keeping existing event limits and permissions intact.
ALTER TABLE public.guest_song_request_settings
  DROP CONSTRAINT IF EXISTS guest_song_request_settings_max_requests_per_guest_check;
ALTER TABLE public.guest_song_request_settings
  ADD CONSTRAINT guest_song_request_settings_max_requests_per_guest_check
  CHECK (max_requests_per_guest BETWEEN 1 AND 25);
