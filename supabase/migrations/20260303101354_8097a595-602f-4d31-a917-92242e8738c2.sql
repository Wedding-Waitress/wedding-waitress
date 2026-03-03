
-- ============================================
-- Dynamic QR Codes table
-- ============================================
CREATE TABLE public.dynamic_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'My QR Code',
  current_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  destination_type TEXT NOT NULL DEFAULT 'guest_lookup',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dynamic_qr_codes_user_id ON public.dynamic_qr_codes(user_id);

-- RLS
ALTER TABLE public.dynamic_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dynamic QR codes"
  ON public.dynamic_qr_codes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- QR Scan Logs table
-- ============================================
CREATE TABLE public.qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES public.dynamic_qr_codes(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  referrer TEXT
);

-- Indexes
CREATE INDEX idx_qr_scan_logs_qr_code_id ON public.qr_scan_logs(qr_code_id);
CREATE INDEX idx_qr_scan_logs_scanned_at ON public.qr_scan_logs(scanned_at);

-- RLS
ALTER TABLE public.qr_scan_logs ENABLE ROW LEVEL SECURITY;

-- Owner can read scan logs for their QR codes
CREATE POLICY "Users can read scan logs for their QR codes"
  ON public.qr_scan_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dynamic_qr_codes dqr
      WHERE dqr.id = qr_scan_logs.qr_code_id
        AND dqr.user_id = auth.uid()
    )
  );

-- Service role can insert scan logs (used by edge function)
CREATE POLICY "Service role can insert scan logs"
  ON public.qr_scan_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- Function: generate unique 6-char code
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_dynamic_qr_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * 62 + 1)::int, 1);
    END LOOP;
    
    IF NOT EXISTS (SELECT 1 FROM dynamic_qr_codes WHERE code = new_code) THEN
      RETURN new_code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique QR code after 100 attempts';
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- Function: resolve dynamic QR code to destination
-- ============================================
CREATE OR REPLACE FUNCTION public.resolve_dynamic_qr(_code TEXT)
RETURNS TABLE(
  qr_code_id UUID,
  event_slug TEXT,
  destination_type TEXT,
  event_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    dqr.id AS qr_code_id,
    e.slug AS event_slug,
    dqr.destination_type,
    dqr.current_event_id AS event_id
  FROM dynamic_qr_codes dqr
  LEFT JOIN events e ON e.id = dqr.current_event_id
  WHERE dqr.code = _code
    AND dqr.is_active = true
  LIMIT 1;
$$;
