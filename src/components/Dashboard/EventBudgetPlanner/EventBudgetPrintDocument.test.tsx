import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventBudgetExpense } from '@/lib/eventBudget';
import { calculateBudgetSummary } from '@/lib/eventBudget';
import { EventBudgetPrintDocument, paginateBudgetExpenses } from './EventBudgetPrintDocument';

const expenses = Array.from({ length: 17 }, (_, index): EventBudgetExpense => ({
  id: `expense-${index}`, event_id: 'event-1', user_id: 'user-1', category: 'Venue', custom_category: null,
  expense_name: `Expense ${index + 1}`, vendor_name: `Vendor ${index + 1}`, contact_person: 'Alex', phone: null,
  email: null, address: null, estimated_cost: 100, actual_cost: null, amount_paid: 20, payment_date: null,
  balance_due_date: null, notes: null, display_order: index, created_at: '', updated_at: '',
}));

describe('EventBudgetPrintDocument', () => {
  it('paginates deterministic rows without splitting expenses', () => {
    expect(paginateBudgetExpenses(expenses).map(page => page.length)).toEqual([6, 6, 5]);
  });

  it('renders authoritative A4 landscape pages with repeated headers and footer page counts', () => {
    const summary = calculateBudgetSummary(5000, expenses);
    const { container } = render(<EventBudgetPrintDocument eventName="Community Gala" eventDate="2026-12-20" currency="GBP" expenses={expenses} summary={summary} generatedAt={new Date('2026-08-24T10:00:00+10:00')} />);
    const pages = container.querySelectorAll('[data-print-mirror-document="event-budget"]');
    expect(pages).toHaveLength(3);
    pages.forEach(page => { expect(page).toHaveAttribute('data-print-mirror-width-mm', '297'); expect(page).toHaveAttribute('data-print-mirror-height-mm', '210'); });
    expect(screen.getAllByText('Business Name')).toHaveLength(3);
    expect(screen.getAllByText('Budgeted Costs')).toHaveLength(3);
    expect(screen.getAllByText('Budgeted')).toHaveLength(3);
    expect(screen.getAllByText('Total Anticipated Budget · GBP')).toHaveLength(3);
    expect(screen.getAllByText('£5,000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getAllByAltText('Wedding Waitress')).toHaveLength(3);
  });
});
