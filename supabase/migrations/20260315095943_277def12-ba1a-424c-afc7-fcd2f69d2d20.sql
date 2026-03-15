-- Performance indexes for high-concurrency QR scan workload (up to 1M scans/day)

-- 1. Partial index for active QR code lookups (used by resolve_dynamic_qr)
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_code_active 
ON public.dynamic_qr_codes(code) WHERE is_active = true;

-- 2. Index for scan log analytics queries by event
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_event_id 
ON public.qr_scan_logs(event_id);

-- 3. Index for scan log analytics queries by QR code
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr_code_id 
ON public.qr_scan_logs(qr_code_id);

-- 4. Covering indexes for get_public_event_with_data_secure hot path
CREATE INDEX IF NOT EXISTS idx_guests_event_id 
ON public.guests(event_id);

CREATE INDEX IF NOT EXISTS idx_live_view_settings_event_id 
ON public.live_view_settings(event_id);

CREATE INDEX IF NOT EXISTS idx_live_view_module_settings_event_id 
ON public.live_view_module_settings(event_id);

-- 5. Index for guest access token lookups during live view
CREATE INDEX IF NOT EXISTS idx_guest_access_tokens_guest_id 
ON public.guest_access_tokens(guest_id);