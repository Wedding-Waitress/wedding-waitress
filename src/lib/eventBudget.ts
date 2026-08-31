import type { CurrencyCode } from './currencyPricing';
import { detectCurrency } from './currencyPricing';
import { CURRENCY_LOCALE, CURRENCY_PREFIX, isCurrencyCode } from './liveCurrencyPricing';

export const EVENT_BUDGET_CATEGORIES = [
  'Venue', 'Catering', 'Photography', 'Videography', 'Celebrant', 'Entertainment & DJ',
  'Flowers', 'Cake', 'Invitations & Stationery', 'Attire', 'Hair & Beauty', 'Decorations',
  'Hire & Equipment', 'Transport', 'Accommodation', 'Gifts & Favours', 'Other',
] as const;

export type EventBudgetCategory = typeof EVENT_BUDGET_CATEGORIES[number];
export type BudgetPaymentStatus = 'Unpaid' | 'Part Paid' | 'Paid' | 'Due Soon' | 'Overdue';

export interface EventBudgetSettings {
  id: string;
  event_id: string;
  user_id: string;
  anticipated_budget: number;
  currency: CurrencyCode;
  created_at: string;
  updated_at: string;
}

export interface EventBudgetExpense {
  id: string;
  event_id: string;
  user_id: string;
  category: string;
  custom_category: string | null;
  expense_name: string | null;
  vendor_name: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  amount_paid: number;
  payment_date: string | null;
  balance_due_date: string | null;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type EventBudgetExpenseInput = Omit<EventBudgetExpense, 'id' | 'user_id' | 'expense_name' | 'created_at' | 'updated_at'> & {
  expense_name?: string | null;
};

export interface EventBudgetSummary {
  totalBudget: number;
  estimatedCosts: number;
  actualCosts: number;
  committedCosts: number;
  amountPaid: number;
  amountOutstanding: number;
  budgetRemaining: number;
}

const toCents = (value: number | null | undefined): number => Math.round((value ?? 0) * 100);
const fromCents = (value: number): number => value / 100;

export const committedCost = (expense: Pick<EventBudgetExpense, 'actual_cost' | 'estimated_cost'>): number =>
  expense.actual_cost !== null ? expense.actual_cost : expense.estimated_cost ?? 0;

export const expenseOutstanding = (expense: Pick<EventBudgetExpense, 'actual_cost' | 'estimated_cost' | 'amount_paid'>): number =>
  fromCents(Math.max(toCents(committedCost(expense)) - toCents(expense.amount_paid), 0));

export const calculateBudgetSummary = (budget: number, expenses: EventBudgetExpense[]): EventBudgetSummary => {
  const totals = expenses.reduce((sum, expense) => {
    const committed = toCents(committedCost(expense));
    const paid = toCents(expense.amount_paid);
    return {
      estimated: sum.estimated + toCents(expense.estimated_cost),
      actual: sum.actual + toCents(expense.actual_cost),
      committed: sum.committed + committed,
      paid: sum.paid + paid,
      outstanding: sum.outstanding + Math.max(committed - paid, 0),
    };
  }, { estimated: 0, actual: 0, committed: 0, paid: 0, outstanding: 0 });

  return {
    totalBudget: fromCents(toCents(budget)),
    estimatedCosts: fromCents(totals.estimated),
    actualCosts: fromCents(totals.actual),
    committedCosts: fromCents(totals.committed),
    amountPaid: fromCents(totals.paid),
    amountOutstanding: fromCents(totals.outstanding),
    budgetRemaining: fromCents(toCents(budget) - totals.committed),
  };
};

export const getBudgetPaymentStatus = (
  expense: Pick<EventBudgetExpense, 'actual_cost' | 'estimated_cost' | 'amount_paid' | 'balance_due_date'>,
  today = new Date(),
): BudgetPaymentStatus => {
  const outstanding = expenseOutstanding(expense);
  const committed = committedCost(expense);
  if (outstanding <= 0 && committed > 0) return 'Paid';
  if (outstanding > 0 && expense.balance_due_date) {
    const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const due = new Date(`${expense.balance_due_date}T00:00:00`);
    if (!Number.isNaN(due.getTime())) {
      const days = Math.round((due.getTime() - todayKey.getTime()) / 86_400_000);
      if (days < 0) return 'Overdue';
      if (days <= 14) return 'Due Soon';
    }
  }
  if (expense.amount_paid > 0 && outstanding > 0) return 'Part Paid';
  return 'Unpaid';
};

export const formatBudgetCurrency = (currency: CurrencyCode, value: number): string => `${CURRENCY_PREFIX[currency]}${new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value)}`;

export const formatBudgetInput = (currency: CurrencyCode, value: number): string => new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);

export const resolveEventBudgetCurrency = (
  savedEventCurrency?: unknown,
  pricingPreference?: unknown,
  detectedCurrency?: CurrencyCode,
): CurrencyCode => {
  if (isCurrencyCode(savedEventCurrency)) return savedEventCurrency;
  if (isCurrencyCode(pricingPreference)) return pricingPreference;
  return detectedCurrency ?? detectCurrency();
};

export const formatAustralianDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-AU').format(date);
};

export const parseCurrencyInput = (value: string): number | null => {
  const cleaned = value.trim().replace(/^(?:A\$|US\$|\$|£|€)\s*/, '').replace(/[,\s]/g, '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? fromCents(toCents(parsed)) : null;
};
