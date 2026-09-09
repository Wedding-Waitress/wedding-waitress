-- Convert one owner's event budget atomically; RLS remains enforced.
CREATE OR REPLACE FUNCTION public.convert_event_budget_currency(
 p_event_id uuid, p_from text, p_to text, p_rate numeric, p_rate_date date,
 p_expected_updated_at timestamptz, p_expense_versions jsonb, p_budget numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE s public.event_budget_settings; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.events WHERE id=p_event_id AND user_id=auth.uid()) THEN
   RAISE EXCEPTION 'Event not available';
 END IF;
 PERFORM 1 FROM public.events WHERE id=p_event_id FOR UPDATE;
 IF p_from IS NULL OR p_to IS NULL OR p_from NOT IN ('AUD','USD','GBP','EUR') OR p_to NOT IN ('AUD','USD','GBP','EUR') OR p_from=p_to
 OR p_rate IS NULL OR p_rate<=0 OR p_rate>1000 OR p_rate::text IN ('NaN','Infinity','-Infinity')
 OR p_rate_date IS NULL OR p_rate_date>current_date OR p_rate_date<current_date-7 THEN
   RAISE EXCEPTION 'A recent valid exchange rate is required';
 END IF;
 IF p_budget IS NOT NULL AND (p_budget<0 OR p_budget::text IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'Invalid budget'; END IF;
 SELECT * INTO s FROM public.event_budget_settings WHERE event_id=p_event_id FOR UPDATE;
 IF s.id IS NOT NULL AND (s.currency<>p_from OR s.updated_at IS DISTINCT FROM p_expected_updated_at) THEN
   RAISE EXCEPTION 'Budget changed. Refresh and try again';
 ELSIF s.id IS NULL AND p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'Budget changed. Refresh and try again';
 END IF;
 PERFORM 1 FROM public.event_budget_expenses WHERE event_id=p_event_id ORDER BY id FOR UPDATE;
 IF p_expense_versions IS NULL OR jsonb_typeof(p_expense_versions)<>'array' THEN RAISE EXCEPTION 'Expense versions required'; END IF;
 IF (SELECT count(*) FROM public.event_budget_expenses WHERE event_id=p_event_id) <> jsonb_array_length(p_expense_versions)
 OR EXISTS (
   SELECT 1 FROM jsonb_to_recordset(p_expense_versions) AS v(id uuid,updated_at timestamptz)
   LEFT JOIN public.event_budget_expenses e ON e.id=v.id AND e.event_id=p_event_id
   WHERE e.id IS NULL OR e.updated_at IS DISTINCT FROM v.updated_at
 ) OR (SELECT count(DISTINCT v->>'id') FROM jsonb_array_elements(p_expense_versions) v)<>jsonb_array_length(p_expense_versions)
 THEN RAISE EXCEPTION 'Expenses changed. Refresh and try again'; END IF;
 INSERT INTO public.event_budget_settings(event_id,anticipated_budget,currency,planned_budget_kind,planned_budget_range)
 VALUES(p_event_id,round(coalesce(p_budget,s.anticipated_budget,0)*p_rate,2),p_to,
 CASE WHEN p_budget IS NOT NULL THEN 'exact' ELSE coalesce(s.planned_budget_kind,'undecided') END,
 CASE WHEN p_budget IS NOT NULL THEN NULL ELSE s.planned_budget_range END)
 ON CONFLICT(event_id) DO UPDATE SET anticipated_budget=EXCLUDED.anticipated_budget,currency=EXCLUDED.currency,
 planned_budget_kind=EXCLUDED.planned_budget_kind,planned_budget_range=EXCLUDED.planned_budget_range;
 UPDATE public.event_budget_expenses SET
 estimated_cost=round(estimated_cost*p_rate,2),actual_cost=round(actual_cost*p_rate,2),amount_paid=round(amount_paid*p_rate,2)
 WHERE event_id=p_event_id;
 SELECT jsonb_build_object('settings',(SELECT to_jsonb(b) FROM public.event_budget_settings b WHERE event_id=p_event_id),
 'expenses',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY display_order,created_at) FROM public.event_budget_expenses e WHERE event_id=p_event_id),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.convert_event_budget_currency(uuid,text,text,numeric,date,timestamptz,jsonb,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_event_budget_currency(uuid,text,text,numeric,date,timestamptz,jsonb,numeric) TO authenticated;
NOTIFY pgrst, 'reload schema';
