import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventBudgetExpense } from '@/lib/eventBudget';
import { EventBudgetPlanner } from './EventBudgetPlanner';

const mocks = vi.hoisted(() => ({ useEventBudget: vi.fn(), toast: vi.fn(), saveBudget: vi.fn(), saveExpense: vi.fn(), deleteExpense: vi.fn() }));
vi.mock('@/hooks/useEventBudget', () => ({ useEventBudget: mocks.useEventBudget }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/eventBudgetPdfExporter', () => ({ exportEventBudgetPdf: vi.fn() }));

const expense = (overrides: Partial<EventBudgetExpense> = {}): EventBudgetExpense => ({
  id: 'expense-1', event_id: 'event-a', user_id: 'user-1', category: 'Catering', custom_category: null,
  expense_name: 'Dinner service', vendor_name: 'Harbour Catering', contact_person: 'Alex Cook', phone: '0400000000',
  email: 'alex@example.com', address: '1 Harbour Street', estimated_cost: 1200, actual_cost: 1300,
  amount_paid: 300, payment_date: '2026-08-20', balance_due_date: '2026-12-01', notes: 'Vegetarian option',
  display_order: 0, created_at: '2026-08-20T00:00:00Z', updated_at: '2026-08-20T00:00:00Z', ...overrides,
});

const hookValue = (expenses: EventBudgetExpense[] = [expense()]) => ({
  query: { data: { settings: { id: 'budget-1', event_id: 'event-a', user_id: 'user-1', anticipated_budget: 5000, currency: 'AUD', created_at: '', updated_at: '' }, expenses }, isLoading: false, isError: false, refetch: vi.fn() },
  saveBudget: { mutateAsync: mocks.saveBudget, isPending: false }, saveExpense: { mutateAsync: mocks.saveExpense, isPending: false }, deleteExpense: { mutateAsync: mocks.deleteExpense, isPending: false },
});

describe('EventBudgetPlanner interface', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); mocks.saveBudget.mockResolvedValue({}); mocks.saveExpense.mockResolvedValue({}); mocks.deleteExpense.mockResolvedValue({}); mocks.useEventBudget.mockReturnValue(hookValue()); });

  it('renders the approved heading, subtitle, controls and six live summaries', () => {
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala', date: '2026-12-20' }} />);
    expect(screen.getByRole('heading', { name: 'Event Budget Planner' })).toBeInTheDocument();
    expect(screen.getByText('Plan your event spending, track payments and stay on budget.')).toBeInTheDocument();
    ['Total Budget', 'Budgeted Costs', 'Actual Costs', 'Amount Paid', 'Amount Outstanding', 'Budget Remaining'].forEach(label => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: 'Add Expense' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print Budget' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('keeps Print and PDF in the heading and places Add Expense after Sort in the toolbar', () => {
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    const heading = screen.getByRole('heading', { name: 'Event Budget Planner' });
    const headingRow = heading.parentElement?.parentElement;
    expect(within(headingRow as HTMLElement).getByRole('button', { name: 'Print Budget' })).toBeInTheDocument();
    expect(within(headingRow as HTMLElement).getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    expect(within(headingRow as HTMLElement).queryByRole('button', { name: 'Add Expense' })).not.toBeInTheDocument();
    const sort = screen.getByLabelText('Sort expenses');
    const add = screen.getByRole('button', { name: 'Add Expense' });
    expect(sort.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses the saved event currency before the Pricing preference and formats every monetary surface', async () => {
    localStorage.setItem('ww_currency', 'EUR');
    mocks.useEventBudget.mockReturnValue({ ...hookValue(), query: { ...hookValue().query, data: { ...hookValue().query.data, settings: { ...hookValue().query.data.settings, currency: 'USD' } } } });
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    await waitFor(() => expect(screen.getByLabelText('Event budget currency')).toHaveValue('USD'));
    expect(screen.getAllByText('US$5,000.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('US$300.00').length).toBeGreaterThan(0);
  });

  it('uses the Pricing preference before first save and lists the approved currency catalogue', async () => {
    localStorage.setItem('ww_currency', 'GBP');
    const empty = hookValue([]);
    mocks.useEventBudget.mockReturnValue({ ...empty, query: { ...empty.query, data: { settings: null, expenses: [] } } });
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    const selector = await screen.findByLabelText('Event budget currency');
    expect(selector).toHaveValue('GBP');
    expect(within(selector).getAllByRole('option').map(option => option.textContent)).toEqual(['AUD A$', 'USD US$', 'GBP £', 'EUR €']);
  });

  it('confirms currency changes without converting values and Cancel preserves the saved currency', async () => {
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    const selector = screen.getByLabelText('Event budget currency');
    fireEvent.change(selector, { target: { value: 'EUR' } });
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Changing the currency updates the currency used for this event budget. Existing numerical amounts will not be converted.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(selector).toHaveValue('AUD');
    fireEvent.change(selector, { target: { value: 'USD' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Change Currency' }));
    await waitFor(() => expect(mocks.saveBudget).toHaveBeenCalledWith({ anticipatedBudget: 5000, currency: 'USD' }));
    expect(selector).toHaveValue('USD');
  });

  it('shows the useful empty state and opens a blank Add Expense drawer', async () => {
    mocks.useEventBudget.mockReturnValue(hookValue([]));
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    expect(screen.getByText('No expenses added yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first anticipated cost, vendor or payment to begin planning your event budget.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Expense' })[0]);
    expect(await screen.findByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Expense or Item Name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Business Name')).toHaveValue('');
    expect(screen.getByLabelText('Budgeted Cost (AUD A$)')).toBeInTheDocument();
  });

  it('saves a category-only allocation without writing a new expense name or changing the anticipated budget', async () => {
    mocks.useEventBudget.mockReturnValue(hookValue([]));
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Expense' })[0]);
    fireEvent.change(await screen.findByLabelText('Category'), { target: { value: 'Venue' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Expense' }));
    await waitFor(() => expect(mocks.saveExpense).toHaveBeenCalled());
    const savedInput = mocks.saveExpense.mock.calls[0][0].input;
    expect(savedInput).toMatchObject({ event_id: 'event-a', category: 'Venue', vendor_name: null });
    expect(savedInput).not.toHaveProperty('expense_name');
    expect(mocks.saveBudget).not.toHaveBeenCalled();
    expect(screen.getAllByText('A$5,000.00').length).toBeGreaterThan(0);
  });

  it('closes a pristine drawer with Escape and restores focus to its opening control', async () => {
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    const opener = screen.getByRole('button', { name: 'Add Expense' });
    fireEvent.click(opener);
    expect(await screen.findByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Add Expense' })).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('prepopulates Edit Expense and saves trimmed event-scoped values', async () => {
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: /Edit Harbour Catering/ }));
    expect(await screen.findByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
    expect(screen.getByLabelText('Business Name')).toHaveValue('Harbour Catering');
    fireEvent.change(screen.getByLabelText('Business Name'), { target: { value: '  Updated Catering  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(mocks.saveExpense).toHaveBeenCalled());
    expect(mocks.saveExpense.mock.calls[0][0]).toMatchObject({ id: 'expense-1', input: { event_id: 'event-a', expense_name: 'Dinner service', vendor_name: 'Updated Catering' } });
  });

  it('preserves form values and shows an error when saving fails', async () => {
    mocks.saveExpense.mockRejectedValueOnce(new Error('Secure save failed'));
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: /Edit Harbour Catering/ }));
    const name = await screen.findByLabelText('Business Name');
    fireEvent.change(name, { target: { value: 'Edited catering business' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Secure save failed')).toBeInTheDocument();
    expect(name).toHaveValue('Edited catering business');
  });

  it('requires named delete confirmation', async () => {
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: /Edit Harbour Catering/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Expense' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Harbour Catering will be permanently removed/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Expense' }));
    await waitFor(() => expect(mocks.deleteExpense).toHaveBeenCalledWith('expense-1'));
  });

  it('searches contact fields, filters status, keeps session controls and isolates event hook keys', () => {
    const { rerender } = render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    fireEvent.change(screen.getByPlaceholderText('Search expenses, businesses or contacts'), { target: { value: 'alex@example.com' } });
    expect(screen.getAllByText('Harbour Catering').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Filter by payment status'), { target: { value: 'Paid' } });
    expect(screen.getByText('No matching expenses')).toBeInTheDocument();
    rerender(<EventBudgetPlanner event={{ id: 'event-b', name: 'Awards Night' }} />);
    expect(mocks.useEventBudget).toHaveBeenLastCalledWith('event-b');
    expect(screen.getByPlaceholderText('Search expenses, businesses or contacts')).toHaveValue('alex@example.com');
  });

  it('falls back to a legacy expense name and then category when no business name exists', () => {
    mocks.useEventBudget.mockReturnValue(hookValue([
      expense({ id: 'legacy', vendor_name: null, expense_name: 'Legacy room hire' }),
      expense({ id: 'category-only', category: 'Flowers', vendor_name: null, expense_name: null }),
    ]));
    render(<EventBudgetPlanner event={{ id: 'event-a', name: 'Community Gala' }} />);
    expect(screen.getAllByText('Legacy room hire').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Flowers').length).toBeGreaterThan(0);
  });
});
