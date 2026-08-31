-- Allow couples to reserve a category budget before selecting a business.
-- The legacy expense_name column and all existing rows remain unchanged.
ALTER TABLE IF EXISTS public.event_budget_expenses
  DROP CONSTRAINT IF EXISTS event_budget_expenses_name_or_vendor_check;

NOTIFY pgrst, 'reload schema';
