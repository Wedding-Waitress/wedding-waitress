-- Event-specific budget settings and expenses for the Dashboard Budget Planner.
-- This migration is intentionally local-only until explicitly applied by an operator.

CREATE TABLE public.event_budget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  anticipated_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (anticipated_budget >= 0),
  currency text NOT NULL DEFAULT 'AUD' CHECK (currency = 'AUD'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_budget_settings_event_id_key UNIQUE (event_id)
);

CREATE TABLE public.event_budget_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (length(btrim(category)) > 0),
  custom_category text,
  expense_name text,
  vendor_name text,
  contact_person text,
  phone text,
  email text,
  address text,
  estimated_cost numeric(14,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  actual_cost numeric(14,2) CHECK (actual_cost IS NULL OR actual_cost >= 0),
  amount_paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_date date,
  balance_due_date date,
  notes text,
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_budget_expenses_name_or_vendor_check CHECK (
    nullif(btrim(expense_name), '') IS NOT NULL OR nullif(btrim(vendor_name), '') IS NOT NULL
  ),
  CONSTRAINT event_budget_expenses_custom_category_check CHECK (
    category <> 'Other' OR nullif(btrim(custom_category), '') IS NOT NULL
  )
);

CREATE INDEX event_budget_settings_user_id_idx ON public.event_budget_settings(user_id);
CREATE INDEX event_budget_expenses_event_id_idx ON public.event_budget_expenses(event_id);
CREATE INDEX event_budget_expenses_user_id_idx ON public.event_budget_expenses(user_id);
CREATE INDEX event_budget_expenses_event_order_idx ON public.event_budget_expenses(event_id, display_order, created_at);
CREATE INDEX event_budget_expenses_due_date_idx ON public.event_budget_expenses(event_id, balance_due_date)
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
  IF auth.uid() IS NULL OR NOT public.can_access_event(auth.uid(), NEW.event_id) THEN
    RAISE EXCEPTION 'Not authorised to manage this event budget' USING ERRCODE = '42501';
  END IF;

  SELECT events.user_id INTO event_owner_id
  FROM public.events
  WHERE events.id = NEW.event_id;

  IF event_owner_id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = '23503';
  END IF;

  NEW.user_id := event_owner_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_budget_owner() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER set_event_budget_settings_owner
BEFORE INSERT OR UPDATE OF event_id, user_id ON public.event_budget_settings
FOR EACH ROW EXECUTE FUNCTION public.set_event_budget_owner();

CREATE TRIGGER set_event_budget_expenses_owner
BEFORE INSERT OR UPDATE OF event_id, user_id ON public.event_budget_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_event_budget_owner();

CREATE TRIGGER update_event_budget_settings_updated_at
BEFORE UPDATE ON public.event_budget_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_budget_expenses_updated_at
BEFORE UPDATE ON public.event_budget_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.event_budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_budget_expenses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_budget_settings, public.event_budget_expenses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_budget_settings, public.event_budget_expenses TO authenticated;

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

COMMENT ON TABLE public.event_budget_settings IS 'One anticipated AUD budget per event.';
COMMENT ON TABLE public.event_budget_expenses IS 'Event-specific anticipated costs, vendors and payment tracking.';

NOTIFY pgrst, 'reload schema';
