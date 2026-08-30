import { describe, expect, it } from 'vitest';
import {
  calculateBudgetSummary, committedCost, expenseOutstanding, getBudgetPaymentStatus, parseCurrencyInput,
  formatBudgetCurrency, resolveEventBudgetCurrency, type EventBudgetExpense,
} from './eventBudget';

const expense = (overrides: Partial<EventBudgetExpense> = {}): EventBudgetExpense => ({
  id: 'expense-1', event_id: 'event-1', user_id: 'user-1', category: 'Venue', custom_category: null,
  expense_name: 'Room hire', vendor_name: 'Harbour Room', contact_person: null, phone: null, email: null,
  address: null, estimated_cost: 1000, actual_cost: null, amount_paid: 0, payment_date: null,
  balance_due_date: null, notes: null, display_order: 0, created_at: '2026-08-24T00:00:00Z',
  updated_at: '2026-08-24T00:00:00Z', ...overrides,
});

describe('event budget calculations', () => {
  it('totals estimated, actual, committed, paid, outstanding and remaining values', () => {
    const result = calculateBudgetSummary(5000, [
      expense({ estimated_cost: 1000, actual_cost: null, amount_paid: 250 }),
      expense({ id: 'expense-2', estimated_cost: 800, actual_cost: 900, amount_paid: 900 }),
      expense({ id: 'expense-3', estimated_cost: null, actual_cost: null, amount_paid: 50 }),
    ]);
    expect(result).toEqual({ totalBudget: 5000, estimatedCosts: 1800, actualCosts: 900, committedCosts: 1900, amountPaid: 1200, amountOutstanding: 750, budgetRemaining: 3100 });
  });

  it('uses actual cost before estimated cost and otherwise zero', () => {
    expect(committedCost(expense({ estimated_cost: 100, actual_cost: 80 }))).toBe(80);
    expect(committedCost(expense({ estimated_cost: 100, actual_cost: null }))).toBe(100);
    expect(committedCost(expense({ estimated_cost: null, actual_cost: null }))).toBe(0);
  });

  it('shows a negative remaining amount when committed costs exceed budget', () => {
    expect(calculateBudgetSummary(500, [expense({ actual_cost: 750 })]).budgetRemaining).toBe(-250);
  });

  it('never makes outstanding negative when amount paid exceeds cost', () => {
    const overpaid = expense({ actual_cost: 100, amount_paid: 150 });
    expect(expenseOutstanding(overpaid)).toBe(0);
    expect(getBudgetPaymentStatus(overpaid)).toBe('Paid');
  });

  it('derives unpaid, part-paid and paid states', () => {
    expect(getBudgetPaymentStatus(expense({ amount_paid: 0 }))).toBe('Unpaid');
    expect(getBudgetPaymentStatus(expense({ amount_paid: 1 }))).toBe('Part Paid');
    expect(getBudgetPaymentStatus(expense({ amount_paid: 1000 }))).toBe('Paid');
  });

  it('gives overdue and due-soon dates precedence while money remains outstanding', () => {
    const today = new Date(2026, 7, 24);
    expect(getBudgetPaymentStatus(expense({ balance_due_date: '2026-08-23' }), today)).toBe('Overdue');
    expect(getBudgetPaymentStatus(expense({ amount_paid: 100, balance_due_date: '2026-09-07' }), today)).toBe('Due Soon');
    expect(getBudgetPaymentStatus(expense({ balance_due_date: '2026-09-08' }), today)).toBe('Unpaid');
  });

  it('handles zero values and currency parsing without floating-point drift', () => {
    expect(calculateBudgetSummary(0, [])).toEqual({ totalBudget: 0, estimatedCosts: 0, actualCosts: 0, committedCosts: 0, amountPaid: 0, amountOutstanding: 0, budgetRemaining: 0 });
    expect(parseCurrencyInput('$1,234.56')).toBe(1234.56);
    expect(parseCurrencyInput('20,000')).toBe(20000);
    expect(parseCurrencyInput('20000')).toBe(20000);
    expect(parseCurrencyInput('€20,000.25')).toBe(20000.25);
    expect(parseCurrencyInput('-1')).toBeNull();
    expect(parseCurrencyInput('1.234')).toBeNull();
    expect(parseCurrencyInput('abc')).toBeNull();
  });

  it('reuses the supported pricing currencies for formatting and default priority', () => {
    expect(formatBudgetCurrency('AUD', 20000)).toBe('A$20,000.00');
    expect(formatBudgetCurrency('USD', 20000)).toBe('US$20,000.00');
    expect(formatBudgetCurrency('GBP', 20000)).toBe('£20,000.00');
    expect(formatBudgetCurrency('EUR', 20000)).toBe('€20,000.00');
    expect(resolveEventBudgetCurrency('GBP', 'USD', 'EUR')).toBe('GBP');
    expect(resolveEventBudgetCurrency(null, 'USD', 'EUR')).toBe('USD');
    expect(resolveEventBudgetCurrency(null, null, 'EUR')).toBe('EUR');
    expect(resolveEventBudgetCurrency(null, null, 'AUD')).toBe('AUD');
  });
});
