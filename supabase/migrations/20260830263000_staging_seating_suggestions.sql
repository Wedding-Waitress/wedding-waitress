CREATE TABLE IF NOT EXISTS public.ai_seating_suggestions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,suggested_table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  confidence_score numeric(3,2) CHECK(confidence_score BETWEEN 0 AND 1),reasoning text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,guest_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_seating_suggestions_event_status ON public.ai_seating_suggestions(event_id,status);
CREATE INDEX IF NOT EXISTS idx_ai_seating_suggestions_guest ON public.ai_seating_suggestions(guest_id);
CREATE INDEX IF NOT EXISTS idx_ai_seating_suggestions_table ON public.ai_seating_suggestions(suggested_table_id);
ALTER TABLE public.ai_seating_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_seating_suggestions FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ai_seating_suggestions TO authenticated;
DROP POLICY IF EXISTS "Event managers manage seating suggestions" ON public.ai_seating_suggestions;
CREATE POLICY "Event managers manage seating suggestions" ON public.ai_seating_suggestions FOR ALL TO authenticated
USING(public.can_access_event((SELECT auth.uid()),event_id)) WITH CHECK(public.can_access_event((SELECT auth.uid()),event_id));
DROP TRIGGER IF EXISTS update_ai_seating_suggestions_updated_at ON public.ai_seating_suggestions;
CREATE TRIGGER update_ai_seating_suggestions_updated_at BEFORE UPDATE ON public.ai_seating_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
