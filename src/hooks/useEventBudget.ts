import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EventBudgetExpense, EventBudgetExpenseInput, EventBudgetSettings } from '@/lib/eventBudget';
import type { CurrencyCode } from '@/lib/currencyPricing';

export const eventBudgetKeys = {
  all: ['event-budget'] as const,
  event: (eventId: string) => [...eventBudgetKeys.all, eventId] as const,
};

export interface EventBudgetData {
  settings: EventBudgetSettings | null;
  expenses: EventBudgetExpense[];
}

const loadEventBudget = async (eventId: string): Promise<EventBudgetData> => {
  const [settingsResult, expensesResult] = await Promise.all([
    supabase.from('event_budget_settings').select('*').eq('event_id', eventId).maybeSingle(),
    supabase.from('event_budget_expenses').select('*').eq('event_id', eventId).order('display_order').order('created_at'),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (expensesResult.error) throw expensesResult.error;
  return {
    settings: settingsResult.data as EventBudgetSettings | null,
    expenses: (expensesResult.data ?? []) as EventBudgetExpense[],
  };
};

export const useEventBudget = (eventId: string | null) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: eventId ? eventBudgetKeys.event(eventId) : [...eventBudgetKeys.all, 'none'],
    queryFn: () => loadEventBudget(eventId as string),
    enabled: Boolean(eventId),
    staleTime: 15_000,
  });

  const updateCached = (next: EventBudgetData) => {
    if (eventId) queryClient.setQueryData(eventBudgetKeys.event(eventId), next);
  };

  const saveBudget = useMutation({
    mutationFn: async ({ anticipatedBudget, currency, plannedBudgetKind = 'exact', plannedBudgetRange = null }: { anticipatedBudget: number; currency: CurrencyCode; plannedBudgetKind?: EventBudgetSettings['planned_budget_kind']; plannedBudgetRange?: string | null }) => {
      if (!eventId) throw new Error('Select an event before saving a budget.');
      const { data, error } = await supabase.from('event_budget_settings').upsert({
        event_id: eventId, anticipated_budget: anticipatedBudget, currency,
        planned_budget_kind: plannedBudgetKind,
        planned_budget_range: plannedBudgetKind === 'range' ? plannedBudgetRange : null,
      }, { onConflict: 'event_id' }).select().single();
      if (error || !data) throw error ?? new Error('The budget save did not affect a row.');
      return data as EventBudgetSettings;
    },
    onSuccess: (settings) => updateCached({ settings, expenses: query.data?.expenses ?? [] }),
  });

  const saveExpense = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: EventBudgetExpenseInput }) => {
      if (!eventId || input.event_id !== eventId) throw new Error('The selected event changed. Reopen the expense and try again.');
      const request = id
        ? supabase.from('event_budget_expenses').update(input).eq('id', id).eq('event_id', eventId)
        : supabase.from('event_budget_expenses').insert(input);
      const { data, error } = await request.select().single();
      if (error || !data) throw error ?? new Error('The expense save did not affect a row.');
      return data as EventBudgetExpense;
    },
    onSuccess: (expense) => {
      const current = query.data ?? { settings: null, expenses: [] };
      const exists = current.expenses.some(item => item.id === expense.id);
      updateCached({ ...current, expenses: exists
        ? current.expenses.map(item => item.id === expense.id ? expense : item)
        : [...current.expenses, expense] });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!eventId) throw new Error('Select an event before deleting an expense.');
      const { data, error } = await supabase.from('event_budget_expenses')
        .delete().eq('id', expenseId).eq('event_id', eventId).select('id').single();
      if (error || !data) throw error ?? new Error('The expense delete did not affect a row.');
      return data.id;
    },
    onSuccess: (expenseId) => {
      const current = query.data ?? { settings: null, expenses: [] };
      updateCached({ ...current, expenses: current.expenses.filter(item => item.id !== expenseId) });
    },
  });

  return { query, saveBudget, saveExpense, deleteExpense };
};
