-- Staging catch-up for Event Budget and Dynamic QR persistence.
--
-- This migration deliberately reconciles the final schema instead of replaying
-- historical migration versions. It is safe to run when the objects are absent
-- (the current staging state) and when the historical migrations already ran.
-- It does not create or modify payment, subscription, or billing objects.

-- ---------------------------------------------------------------------------
-- Event Budget
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_budget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  anticipated_budget numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AUD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_budget_settings_event_id_key UNIQUE (event_id),
  CONSTRAINT event_budget_settings_anticipated_budget_check CHECK (anticipated_budget >= 0),
  CONSTRAINT event_budget_settings_currency_check CHECK (currency IN ('AUD', 'USD', 'GBP', 'EUR'))
);

CREATE TABLE IF NOT EXISTS public.event_budget_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  custom_category text,
  expense_name text,
  vendor_name text,
  contact_person text,
  phone text,
  email text,
  address text,
  estimated_cost numeric(14,2),
  actual_cost numeric(14,2),
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  payment_date date,
  balance_due_date date,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_budget_expenses_category_check CHECK (length(btrim(category)) > 0),
  CONSTRAINT event_budget_expenses_custom_category_check CHECK (
    category <> 'Other' OR nullif(btrim(custom_category), '') IS NOT NULL
  ),
  CONSTRAINT event_budget_expenses_estimated_cost_check CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  CONSTRAINT event_budget_expenses_actual_cost_check CHECK (actual_cost IS NULL OR actual_cost >= 0),
  CONSTRAINT event_budget_expenses_amount_paid_check CHECK (amount_paid >= 0),
  CONSTRAINT event_budget_expenses_display_order_check CHECK (display_order >= 0)
);

-- Reconcile columns needed by the current client if either table was only
-- partially created outside the migration ledger.
ALTER TABLE public.event_budget_settings
  ADD COLUMN IF NOT EXISTS anticipated_budget numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.event_budget_expenses
  ADD COLUMN IF NOT EXISTS custom_category text,
  ADD COLUMN IF NOT EXISTS expense_name text,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(14,2),
  ADD COLUMN IF NOT EXISTS actual_cost numeric(14,2),
  ADD COLUMN IF NOT EXISTS amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS balance_due_date date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- The two follow-up Budget migrations define these final constraints. Rebuild
-- only these named checks so a partially applied historical version converges.
ALTER TABLE public.event_budget_settings
  ALTER COLUMN currency SET DEFAULT 'AUD',
  DROP CONSTRAINT IF EXISTS event_budget_settings_currency_check;

ALTER TABLE public.event_budget_settings
  ADD CONSTRAINT event_budget_settings_currency_check
  CHECK (currency IN ('AUD', 'USD', 'GBP', 'EUR')) NOT VALID;
ALTER TABLE public.event_budget_settings
  VALIDATE CONSTRAINT event_budget_settings_currency_check;

ALTER TABLE public.event_budget_expenses
  DROP CONSTRAINT IF EXISTS event_budget_expenses_name_or_vendor_check;

CREATE UNIQUE INDEX IF NOT EXISTS event_budget_settings_event_id_uidx
  ON public.event_budget_settings(event_id);
CREATE INDEX IF NOT EXISTS event_budget_settings_user_id_idx
  ON public.event_budget_settings(user_id);
CREATE INDEX IF NOT EXISTS event_budget_expenses_event_id_idx
  ON public.event_budget_expenses(event_id);
CREATE INDEX IF NOT EXISTS event_budget_expenses_user_id_idx
  ON public.event_budget_expenses(user_id);
CREATE INDEX IF NOT EXISTS event_budget_expenses_event_order_idx
  ON public.event_budget_expenses(event_id, display_order, created_at);
CREATE INDEX IF NOT EXISTS event_budget_expenses_due_date_idx
  ON public.event_budget_expenses(event_id, balance_due_date)
  WHERE balance_due_date IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_event_budget_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_owner_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT public.can_access_event((SELECT auth.uid()), NEW.event_id) THEN
    RAISE EXCEPTION 'Not authorised to manage this event budget'
      USING ERRCODE = '42501';
  END IF;

  SELECT event_row.user_id
    INTO event_owner_id
  FROM public.events AS event_row
  WHERE event_row.id = NEW.event_id;

  IF event_owner_id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = '23503';
  END IF;

  NEW.user_id := event_owner_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_event_budget_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_budget_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_event_budget_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_event_budget_settings_owner ON public.event_budget_settings;
CREATE TRIGGER set_event_budget_settings_owner
BEFORE INSERT OR UPDATE OF event_id, user_id ON public.event_budget_settings
FOR EACH ROW EXECUTE FUNCTION public.set_event_budget_owner();

DROP TRIGGER IF EXISTS set_event_budget_expenses_owner ON public.event_budget_expenses;
CREATE TRIGGER set_event_budget_expenses_owner
BEFORE INSERT OR UPDATE OF event_id, user_id ON public.event_budget_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_event_budget_owner();

DROP TRIGGER IF EXISTS update_event_budget_settings_updated_at ON public.event_budget_settings;
CREATE TRIGGER update_event_budget_settings_updated_at
BEFORE UPDATE ON public.event_budget_settings
FOR EACH ROW EXECUTE FUNCTION public.set_event_budget_updated_at();

DROP TRIGGER IF EXISTS update_event_budget_expenses_updated_at ON public.event_budget_expenses;
CREATE TRIGGER update_event_budget_expenses_updated_at
BEFORE UPDATE ON public.event_budget_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_event_budget_updated_at();

ALTER TABLE public.event_budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_budget_expenses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_budget_settings, public.event_budget_expenses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.event_budget_settings, public.event_budget_expenses
  TO authenticated;

DO $policy_cleanup$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('event_budget_settings', 'event_budget_expenses')
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END;
$policy_cleanup$;

CREATE POLICY "Event managers read budget settings"
ON public.event_budget_settings FOR SELECT TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Event managers create budget settings"
ON public.event_budget_settings FOR INSERT TO authenticated
WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Event managers update budget settings"
ON public.event_budget_settings FOR UPDATE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id))
WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Event managers delete budget settings"
ON public.event_budget_settings FOR DELETE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));

CREATE POLICY "Event managers read budget expenses"
ON public.event_budget_expenses FOR SELECT TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Event managers create budget expenses"
ON public.event_budget_expenses FOR INSERT TO authenticated
WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Event managers update budget expenses"
ON public.event_budget_expenses FOR UPDATE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id))
WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Event managers delete budget expenses"
ON public.event_budget_expenses FOR DELETE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));

-- ---------------------------------------------------------------------------
-- Dynamic QR Codes and scan analytics
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dynamic_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL DEFAULT 'My QR Code',
  current_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  destination_type text NOT NULL DEFAULT 'guest_lookup',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dynamic_qr_codes_code_key UNIQUE (code),
  CONSTRAINT dynamic_qr_codes_code_check CHECK (code ~ '^[0-9A-Za-z]{6}$'),
  CONSTRAINT dynamic_qr_codes_label_check CHECK (length(btrim(label)) > 0),
  CONSTRAINT dynamic_qr_codes_destination_type_check CHECK (
    destination_type IN ('guest_lookup', 'kiosk')
  )
);

CREATE TABLE IF NOT EXISTS public.qr_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL REFERENCES public.dynamic_qr_codes(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_hash text,
  referrer text
);

ALTER TABLE public.dynamic_qr_codes
  ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT 'My QR Code',
  ADD COLUMN IF NOT EXISTS current_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_type text NOT NULL DEFAULT 'guest_lookup',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.qr_scan_logs
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS referrer text;

DO $constraint_reconciliation$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.dynamic_qr_codes'::regclass
      AND conname = 'dynamic_qr_codes_code_check'
  ) THEN
    ALTER TABLE public.dynamic_qr_codes
      ADD CONSTRAINT dynamic_qr_codes_code_check
      CHECK (code ~ '^[0-9A-Za-z]{6}$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.dynamic_qr_codes'::regclass
      AND conname = 'dynamic_qr_codes_label_check'
  ) THEN
    ALTER TABLE public.dynamic_qr_codes
      ADD CONSTRAINT dynamic_qr_codes_label_check
      CHECK (length(btrim(label)) > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.dynamic_qr_codes'::regclass
      AND conname = 'dynamic_qr_codes_destination_type_check'
  ) THEN
    ALTER TABLE public.dynamic_qr_codes
      ADD CONSTRAINT dynamic_qr_codes_destination_type_check
      CHECK (destination_type IN ('guest_lookup', 'kiosk')) NOT VALID;
  END IF;
END;
$constraint_reconciliation$;

ALTER TABLE public.dynamic_qr_codes
  VALIDATE CONSTRAINT dynamic_qr_codes_code_check,
  VALIDATE CONSTRAINT dynamic_qr_codes_label_check,
  VALIDATE CONSTRAINT dynamic_qr_codes_destination_type_check;

-- The unique index is the final arbiter against manually supplied duplicates.
-- The sequence-backed generator below also ensures concurrent generator calls
-- never receive the same candidate, avoiding the historical check-then-return
-- race between separate RPC calls.
CREATE UNIQUE INDEX IF NOT EXISTS dynamic_qr_codes_code_uidx
  ON public.dynamic_qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_user_id
  ON public.dynamic_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_current_event_id
  ON public.dynamic_qr_codes(current_event_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_code_active
  ON public.dynamic_qr_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr_code_id
  ON public.qr_scan_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at
  ON public.qr_scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_event_id
  ON public.qr_scan_logs(event_id);

CREATE SEQUENCE IF NOT EXISTS public.dynamic_qr_code_sequence
  AS bigint
  MINVALUE 1
  MAXVALUE 56800235583
  START WITH 1
  NO CYCLE;

REVOKE ALL ON SEQUENCE public.dynamic_qr_code_sequence FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_dynamic_qr_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  sequence_value bigint;
  remaining bigint;
  generated_code text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  LOOP
    sequence_value := nextval('public.dynamic_qr_code_sequence');
    remaining := sequence_value;
    generated_code := '';

    WHILE remaining > 0 LOOP
      generated_code := substr(alphabet, (remaining % 62)::integer + 1, 1) || generated_code;
      remaining := remaining / 62;
    END LOOP;

    generated_code := lpad(generated_code, 6, '0');

    -- This also skips codes created by the historical random generator.
    IF NOT EXISTS (
      SELECT 1 FROM public.dynamic_qr_codes AS qr
      WHERE qr.code = generated_code
    ) THEN
      RETURN generated_code;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_dynamic_qr_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_dynamic_qr_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_dynamic_qr_owner_and_event_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := actor_id;
  ELSIF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'A QR code owner cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.current_event_id IS NOT NULL
     AND NOT public.can_access_event(actor_id, NEW.current_event_id) THEN
    RAISE EXCEPTION 'Not authorised to link this QR code to that event'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_dynamic_qr_owner_and_event_access()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_dynamic_qr_owner_and_event_access ON public.dynamic_qr_codes;
CREATE TRIGGER enforce_dynamic_qr_owner_and_event_access
BEFORE INSERT OR UPDATE OF user_id, current_event_id ON public.dynamic_qr_codes
FOR EACH ROW EXECUTE FUNCTION public.enforce_dynamic_qr_owner_and_event_access();

ALTER TABLE public.dynamic_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scan_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.dynamic_qr_codes, public.qr_scan_logs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dynamic_qr_codes TO authenticated;
GRANT SELECT ON TABLE public.qr_scan_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dynamic_qr_codes, public.qr_scan_logs TO service_role;

DO $policy_cleanup$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('dynamic_qr_codes', 'qr_scan_logs')
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END;
$policy_cleanup$;

CREATE POLICY "QR owners and event managers read codes"
ON public.dynamic_qr_codes FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (
    current_event_id IS NOT NULL
    AND public.can_access_event((SELECT auth.uid()), current_event_id)
  )
);

CREATE POLICY "QR owners create codes for accessible events"
ON public.dynamic_qr_codes FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    current_event_id IS NULL
    OR public.can_access_event((SELECT auth.uid()), current_event_id)
  )
);

CREATE POLICY "QR owners update codes for accessible events"
ON public.dynamic_qr_codes FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    current_event_id IS NULL
    OR public.can_access_event((SELECT auth.uid()), current_event_id)
  )
);

CREATE POLICY "QR owners delete codes"
ON public.dynamic_qr_codes FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "QR owners and event managers read scan logs"
ON public.qr_scan_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.dynamic_qr_codes AS qr
    WHERE qr.id = qr_scan_logs.qr_code_id
      AND (
        qr.user_id = (SELECT auth.uid())
        OR (
          qr.current_event_id IS NOT NULL
          AND public.can_access_event((SELECT auth.uid()), qr.current_event_id)
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.resolve_dynamic_qr(_code text)
RETURNS TABLE(
  qr_code_id uuid,
  event_slug text,
  destination_type text,
  event_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    qr.id,
    event_row.slug,
    qr.destination_type,
    qr.current_event_id
  FROM public.dynamic_qr_codes AS qr
  LEFT JOIN public.events AS event_row ON event_row.id = qr.current_event_id
  WHERE qr.code = btrim(_code)
    AND qr.is_active = true
  LIMIT 1
$$;

-- Resolution is an Edge Function concern. Keeping this SECURITY DEFINER RPC
-- service-role-only prevents it becoming a second unauthenticated lookup API.
REVOKE ALL ON FUNCTION public.resolve_dynamic_qr(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dynamic_qr(text) TO service_role;

COMMENT ON TABLE public.event_budget_settings IS
  'One anticipated budget and currency per event.';
COMMENT ON TABLE public.event_budget_expenses IS
  'Event-scoped anticipated costs, vendors, and payment tracking.';
COMMENT ON TABLE public.dynamic_qr_codes IS
  'Permanent user-owned QR identifiers that may target an accessible event.';
COMMENT ON TABLE public.qr_scan_logs IS
  'Server-written analytics for dynamic QR scans.';

NOTIFY pgrst, 'reload schema';
