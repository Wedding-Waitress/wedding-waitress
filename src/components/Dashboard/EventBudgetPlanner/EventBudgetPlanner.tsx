import React from 'react';
import {
  AlertCircle, CheckCircle2, Clock3, Download, Edit3, Plus, Printer,
  Save, Search, WalletCards,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useEventBudget } from '@/hooks/useEventBudget';
import {
  calculateBudgetSummary, EVENT_BUDGET_CATEGORIES, type BudgetPaymentStatus,
  type EventBudgetExpense, type EventBudgetExpenseInput, expenseOutstanding,
  formatAustralianDate, formatBudgetCurrency, formatBudgetInput, getBudgetPaymentStatus, parseCurrencyInput,
  resolveEventBudgetCurrency,
} from '@/lib/eventBudget';
import type { CurrencyCode } from '@/lib/currencyPricing';
import { CURRENCY_PREFIX, SUPPORTED_PRICING_CURRENCIES } from '@/lib/liveCurrencyPricing';
import { exportEventBudgetPdf } from '@/lib/eventBudgetPdfExporter';
import { ExpenseDrawer } from './ExpenseDrawer';
import { EventBudgetPrintDocument } from './EventBudgetPrintDocument';
import styles from './EventBudgetPlanner.module.css';

interface BudgetPlannerEvent { id: string; name: string; date?: string | null }
type SortKey = 'category' | 'expense' | 'estimated' | 'actual' | 'paid' | 'outstanding' | 'due';

const STATUS_OPTIONS: Array<'All Statuses' | BudgetPaymentStatus> = ['All Statuses', 'Unpaid', 'Part Paid', 'Paid', 'Due Soon', 'Overdue'];
const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['category', 'Category'], ['expense', 'Business Name'], ['estimated', 'Budgeted Cost'],
  ['actual', 'Actual Cost'], ['paid', 'Amount Paid'], ['outstanding', 'Amount Outstanding'], ['due', 'Balance Due Date'],
];

const expenseCategory = (expense: EventBudgetExpense): string => expense.category === 'Other' ? expense.custom_category || 'Other' : expense.category;
const expenseTitle = (expense: EventBudgetExpense): string => expense.vendor_name || expense.expense_name || expenseCategory(expense);

export const EventBudgetPlanner: React.FC<{ event: BudgetPlannerEvent }> = ({ event }) => {
  const { toast } = useToast();
  const { query, saveBudget, saveExpense, deleteExpense } = useEventBudget(event.id);
  const data = query.data ?? { settings: null, expenses: [] };
  const [budgetInput, setBudgetInput] = React.useState('');
  const [budgetState, setBudgetState] = React.useState<'idle' | 'saved' | 'error'>('idle');
  const [budgetError, setBudgetError] = React.useState('');
  const [currency, setCurrency] = React.useState<CurrencyCode>(() => resolveEventBudgetCurrency(undefined, typeof window === 'undefined' ? null : window.localStorage.getItem('ww_currency')));
  const [pendingCurrency, setPendingCurrency] = React.useState<CurrencyCode | null>(null);
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('All Categories');
  const [status, setStatus] = React.useState<'All Statuses' | BudgetPaymentStatus>('All Statuses');
  const [sort, setSort] = React.useState<SortKey>('category');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<EventBudgetExpense | null>(null);
  const [printOpen, setPrintOpen] = React.useState(false);
  const [pendingPrintAction, setPendingPrintAction] = React.useState<'print' | 'download' | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [generatedAt, setGeneratedAt] = React.useState(() => new Date());
  const addButtonRef = React.useRef<HTMLButtonElement>(null);
  const drawerReturnRef = React.useRef<HTMLButtonElement>(null);
  const printRootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const resolvedCurrency = resolveEventBudgetCurrency(data.settings?.currency, typeof window === 'undefined' ? null : window.localStorage.getItem('ww_currency'));
    setCurrency(resolvedCurrency);
    setBudgetInput(data.settings ? formatBudgetInput(resolvedCurrency, Number(data.settings.anticipated_budget)) : '');
    setBudgetState('idle'); setBudgetError('');
  }, [data.settings, event.id]);

  React.useEffect(() => { setDrawerOpen(false); setEditingExpense(null); setPendingCurrency(null); }, [event.id]);

  const summary = React.useMemo(() => calculateBudgetSummary(Number(data.settings?.anticipated_budget ?? 0), data.expenses), [data]);
  const lowBudget = summary.totalBudget > 0 && summary.budgetRemaining >= 0 && summary.budgetRemaining <= summary.totalBudget * .1;

  const visibleExpenses = React.useMemo(() => {
    const term = search.trim().toLocaleLowerCase('en-AU');
    const filtered = data.expenses.filter(expense => {
      const searchable = [expense.expense_name, expense.vendor_name, expense.contact_person, expense.phone, expense.email, expense.address].filter(Boolean).join(' ').toLocaleLowerCase('en-AU');
      return (!term || searchable.includes(term))
        && (category === 'All Categories' || expenseCategory(expense) === category || expense.category === category)
        && (status === 'All Statuses' || getBudgetPaymentStatus(expense) === status);
    });
    const compareText = (a: string, b: string) => a.localeCompare(b, 'en-AU', { sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      if (sort === 'category') return compareText(expenseCategory(a), expenseCategory(b));
      if (sort === 'expense') return compareText(`${expenseTitle(a)} ${a.vendor_name ?? ''}`, `${expenseTitle(b)} ${b.vendor_name ?? ''}`);
      if (sort === 'estimated') return (a.estimated_cost ?? 0) - (b.estimated_cost ?? 0);
      if (sort === 'actual') return (a.actual_cost ?? 0) - (b.actual_cost ?? 0);
      if (sort === 'paid') return a.amount_paid - b.amount_paid;
      if (sort === 'outstanding') return expenseOutstanding(a) - expenseOutstanding(b);
      return (a.balance_due_date ?? '9999-12-31').localeCompare(b.balance_due_date ?? '9999-12-31');
    });
  }, [category, data.expenses, search, sort, status]);

  const saveAnticipatedBudget = async () => {
    const value = parseCurrencyInput(budgetInput);
    if (value === null || value <= 0) { setBudgetState('error'); setBudgetError(`Enter a valid positive ${currency} amount with up to two decimal places.`); return; }
    setBudgetError(''); setBudgetState('idle');
    try {
      await saveBudget.mutateAsync({ anticipatedBudget: value, currency }); setBudgetState('saved');
      setBudgetInput(formatBudgetInput(currency, value));
      toast({ title: 'Budget saved', description: `${event.name}'s anticipated budget is now ${formatBudgetCurrency(currency, value)}.` });
    } catch (error) {
      setBudgetState('error'); setBudgetError(error instanceof Error ? error.message : 'The budget could not be saved. Your value has been preserved.');
    }
  };

  const requestCurrencyChange = (nextCurrency: CurrencyCode) => {
    if (nextCurrency === currency) return;
    if (data.settings || data.expenses.length > 0) setPendingCurrency(nextCurrency);
    else setCurrency(nextCurrency);
  };

  const confirmCurrencyChange = async () => {
    if (!pendingCurrency) return;
    const nextCurrency = pendingCurrency;
    const currentBudget = Number(data.settings?.anticipated_budget ?? parseCurrencyInput(budgetInput) ?? 0);
    setBudgetError(''); setBudgetState('idle');
    try {
      await saveBudget.mutateAsync({ anticipatedBudget: currentBudget, currency: nextCurrency });
      setCurrency(nextCurrency);
      setBudgetInput(currentBudget > 0 ? formatBudgetInput(nextCurrency, currentBudget) : '');
      setPendingCurrency(null); setBudgetState('saved');
      toast({ title: 'Budget currency changed', description: `${event.name}'s budget now uses ${nextCurrency}. Existing amounts were not converted.` });
    } catch (error) {
      setPendingCurrency(null); setBudgetState('error');
      setBudgetError(error instanceof Error ? error.message : 'The currency could not be changed. The previous currency has been preserved.');
    }
  };

  const openAdd = (source: React.RefObject<HTMLButtonElement>) => { drawerReturnRef.current = source.current; setEditingExpense(null); setDrawerOpen(true); };
  const openEdit = (expense: EventBudgetExpense, button: HTMLButtonElement) => { drawerReturnRef.current = button; setEditingExpense(expense); setDrawerOpen(true); };

  const handleSaveExpense = async (input: EventBudgetExpenseInput) => {
    await saveExpense.mutateAsync({ id: editingExpense?.id, input });
    toast({ title: editingExpense ? 'Expense updated' : 'Expense added', description: `${input.vendor_name || input.expense_name || input.custom_category || input.category} was saved to ${event.name}.` });
    setDrawerOpen(false); setEditingExpense(null);
  };
  const handleDeleteExpense = async () => {
    if (!editingExpense) return;
    await deleteExpense.mutateAsync(editingExpense.id);
    toast({ title: 'Expense deleted', description: `${expenseTitle(editingExpense)} was removed from ${event.name}.` });
    setDrawerOpen(false); setEditingExpense(null);
  };

  const requestPrintAction = (action: 'print' | 'download') => { setGeneratedAt(new Date()); setPendingPrintAction(action); setPrintOpen(true); };
  React.useEffect(() => {
    if (!printOpen || !pendingPrintAction || !printRootRef.current) return;
    const timer = window.setTimeout(async () => {
      if (!printRootRef.current) return;
      if (pendingPrintAction === 'print') {
        printRootRef.current.dataset.budgetPrintSource = 'true'; window.print(); delete printRootRef.current.dataset.budgetPrintSource;
      } else {
        setExporting(true);
        try { await exportEventBudgetPdf(printRootRef.current, event.name); }
        catch (error) { toast({ title: 'PDF export failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' }); }
        finally { setExporting(false); }
      }
      setPendingPrintAction(null);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [event.name, pendingPrintAction, printOpen, toast]);

  const statusIcon = (value: BudgetPaymentStatus) => value === 'Paid' ? <CheckCircle2 size={14} /> : value === 'Overdue' ? <AlertCircle size={14} /> : <Clock3 size={14} />;

  return <section className={styles.planner} aria-labelledby="event-budget-heading">
    <div className={styles.plannerHeading}>
      <div><h2 id="event-budget-heading">Event Budget Planner</h2><p>Plan your event spending, track payments and stay on budget.</p></div>
      <div className={styles.topActions}>
        <button type="button" className={styles.successButton} onClick={() => requestPrintAction('print')} disabled={query.isLoading}><Printer size={16} aria-hidden="true" />Print Budget</button>
        <button type="button" className={styles.successButton} onClick={() => requestPrintAction('download')} disabled={query.isLoading || exporting}><Download size={16} aria-hidden="true" />{exporting ? 'Preparing PDF…' : 'Download PDF'}</button>
      </div>
    </div>

    <div className={styles.budgetPanel}>
      <div><label htmlFor="anticipated-event-budget">Total Anticipated Event Budget</label><p>{currency} · saved only for {event.name}</p></div>
      <div className={styles.budgetEntry}>
        <div className={styles.amountControl}><span aria-hidden="true">{CURRENCY_PREFIX[currency]}</span><input id="anticipated-event-budget" inputMode="decimal" value={budgetInput} onChange={event => { setBudgetInput(event.target.value); setBudgetState('idle'); setBudgetError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void saveAnticipatedBudget(); } }} aria-invalid={budgetState === 'error'} /></div>
        <label className="sr-only" htmlFor="event-budget-currency">Event budget currency</label>
        <select id="event-budget-currency" className={styles.currencySelect} value={currency} onChange={event => requestCurrencyChange(event.target.value as CurrencyCode)}>
          {SUPPORTED_PRICING_CURRENCIES.map(code => <option key={code} value={code}>{code} {CURRENCY_PREFIX[code]}</option>)}
        </select>
        <button type="button" className={styles.successButton} onClick={() => void saveAnticipatedBudget()} disabled={saveBudget.isPending}><Save size={16} aria-hidden="true" />{saveBudget.isPending ? 'Saving…' : data.settings ? 'Update Budget' : 'Save Budget'}</button>
      </div>
      <div className={styles.budgetFeedback} aria-live="polite">{budgetState === 'saved' && <span data-state="saved"><CheckCircle2 size={14} />Saved</span>}{budgetError && <span data-state="error"><AlertCircle size={14} />{budgetError}</span>}</div>
    </div>

    <div className={styles.summaryGrid} aria-label="Event budget summary">
      {[
        ['Total Budget', summary.totalBudget, 'neutral'], ['Budgeted Costs', summary.estimatedCosts, 'info'],
        ['Actual Costs', summary.actualCosts, 'neutral'], ['Amount Paid', summary.amountPaid, 'success'],
        ['Amount Outstanding', summary.amountOutstanding, summary.amountOutstanding > 0 ? 'warning' : 'success'],
        [summary.budgetRemaining < 0 ? 'Over Budget' : 'Budget Remaining', Math.abs(summary.budgetRemaining), summary.budgetRemaining < 0 ? 'danger' : lowBudget ? 'warning' : 'success'],
      ].map(([label, value, tone]) => <article key={String(label)} className={styles.summaryCard} data-tone={tone}><span>{label}</span><strong>{formatBudgetCurrency(currency, Number(value))}</strong>{label === 'Over Budget' && <small>Committed costs exceed the saved budget</small>}</article>)}
    </div>

    <div className={styles.expensePanel}>
      <div className={styles.controls}>
        <label className={styles.searchField}><span className="sr-only">Search expenses</span><Search size={16} /><input type="search" placeholder="Search expenses, businesses or contacts" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label><span className="sr-only">Filter by category</span><select value={category} onChange={event => setCategory(event.target.value)}><option>All Categories</option>{EVENT_BUDGET_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Filter by payment status</span><select value={status} onChange={event => setStatus(event.target.value as typeof status)}>{STATUS_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Sort expenses</span><select value={sort} onChange={event => setSort(event.target.value as SortKey)}>{SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>Sort: {label}</option>)}</select></label>
        <button ref={addButtonRef} type="button" className={styles.successButton} onClick={() => openAdd(addButtonRef)}><Plus size={17} aria-hidden="true" />Add Expense</button>
      </div>

      {query.isLoading && <div className={styles.loadingState} aria-live="polite"><span className={styles.spinner} />Loading {event.name}'s budget…</div>}
      {query.isError && <div className={styles.errorState} role="alert"><AlertCircle size={18} />The budget could not be loaded. <button onClick={() => void query.refetch()}>Try again</button></div>}
      {!query.isLoading && !query.isError && data.expenses.length === 0 && <div className={styles.emptyState}><WalletCards size={30} /><h3>No expenses added yet</h3><p>Add your first anticipated cost, vendor or payment to begin planning your event budget.</p><button ref={drawerReturnRef} type="button" className={styles.successButton} onClick={() => openAdd(drawerReturnRef)}><Plus size={17} />Add Expense</button></div>}
      {!query.isLoading && !query.isError && data.expenses.length > 0 && visibleExpenses.length === 0 && <div className={styles.emptyState}><Search size={28} /><h3>No matching expenses</h3><p>Try changing your search, category or payment-status filters.</p></div>}

      {visibleExpenses.length > 0 && <>
        <div className={styles.tableRegion} aria-label="Event budget expenses table">
          <table className={styles.expenseTable}><thead><tr><th>Category</th><th>Business Name</th><th>Contact Details</th><th>Budgeted Cost</th><th>Actual Cost</th><th>Amount Paid</th><th>Amount Outstanding</th><th>Payment Date</th><th>Balance Due</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{visibleExpenses.map(expense => { const paymentStatus = getBudgetPaymentStatus(expense); return <tr key={expense.id}>
              <td>{expenseCategory(expense)}</td><td><strong>{expenseTitle(expense)}</strong></td>
              <td>{[expense.contact_person, expense.phone, expense.email, expense.address].filter(Boolean).map(line => <span key={line}>{line}</span>)}</td>
              <td className={styles.money}>{expense.estimated_cost === null ? '—' : formatBudgetCurrency(currency, expense.estimated_cost)}</td><td className={styles.money}>{expense.actual_cost === null ? '—' : formatBudgetCurrency(currency, expense.actual_cost)}</td>
              <td className={styles.money}>{formatBudgetCurrency(currency, expense.amount_paid)}</td><td className={styles.money}>{formatBudgetCurrency(currency, expenseOutstanding(expense))}</td>
              <td>{formatAustralianDate(expense.payment_date)}</td><td>{formatAustralianDate(expense.balance_due_date)}</td>
              <td><span className={styles.statusPill} data-status={paymentStatus}>{statusIcon(paymentStatus)}{paymentStatus}</span></td>
              <td><button type="button" className={`${styles.successButton} ${styles.tableEditButton}`} aria-label={`Edit ${expenseTitle(expense)}`} onClick={event => openEdit(expense, event.currentTarget)}><Edit3 size={14} aria-hidden="true" />Edit</button></td>
            </tr>; })}</tbody></table>
        </div>
        <div className={styles.mobileExpenses}>{visibleExpenses.map(expense => { const paymentStatus = getBudgetPaymentStatus(expense); return <article key={expense.id} className={styles.mobileExpenseCard}>
          <div className={styles.mobileCardHeading}><div><span>{expenseCategory(expense)}</span><h3>{expenseTitle(expense)}</h3>{expense.vendor_name && expense.vendor_name !== expenseTitle(expense) && <p>{expense.vendor_name}</p>}</div><span className={styles.statusPill} data-status={paymentStatus}>{statusIcon(paymentStatus)}{paymentStatus}</span></div>
          <dl><div><dt>Budgeted Cost</dt><dd>{formatBudgetCurrency(currency, expense.estimated_cost ?? 0)}</dd></div><div><dt>Paid</dt><dd>{formatBudgetCurrency(currency, expense.amount_paid)}</dd></div><div><dt>Outstanding</dt><dd>{formatBudgetCurrency(currency, expenseOutstanding(expense))}</dd></div><div><dt>Balance Due</dt><dd>{formatAustralianDate(expense.balance_due_date)}</dd></div></dl>
          <details><summary>View Details</summary><p>{[expense.contact_person, expense.phone, expense.email, expense.address, expense.notes].filter(Boolean).join(' · ') || 'No additional details.'}</p></details>
          <button type="button" className={`${styles.successButton} ${styles.tableEditButton}`} aria-label={`Edit ${expenseTitle(expense)}`} onClick={event => openEdit(expense, event.currentTarget)}><Edit3 size={15} aria-hidden="true" />Edit Expense</button>
        </article>; })}</div>
      </>}
    </div>

    <ExpenseDrawer open={drawerOpen} eventId={event.id} currency={currency} expense={editingExpense} saving={saveExpense.isPending} deleting={deleteExpense.isPending} returnFocusRef={drawerReturnRef} onSave={handleSaveExpense} onDelete={handleDeleteExpense} onClose={() => { setDrawerOpen(false); setEditingExpense(null); }} />

    <AlertDialog open={pendingCurrency !== null} onOpenChange={next => { if (!next) setPendingCurrency(null); }}><AlertDialogContent className={styles.confirmDialog}>
      <AlertDialogHeader><AlertDialogTitle>Change event budget currency?</AlertDialogTitle><AlertDialogDescription>Changing the currency updates the currency used for this event budget. Existing numerical amounts will not be converted.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className={styles.successButton} onClick={event => { event.preventDefault(); void confirmCurrencyChange(); }} disabled={saveBudget.isPending}>Change Currency</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>

    <Dialog open={printOpen} onOpenChange={setPrintOpen}><DialogContent className={styles.printDialog}>
      <DialogHeader><DialogTitle>Event Budget Planner Preview</DialogTitle><DialogDescription>This authoritative A4 landscape preview is used for both browser print and PDF.</DialogDescription></DialogHeader>
      <div className={styles.printDialogActions}><button className={styles.secondaryButton} onClick={() => requestPrintAction('print')}><Printer size={16} />Print Budget</button><button className={styles.successButton} onClick={() => requestPrintAction('download')} disabled={exporting}><Download size={16} />{exporting ? 'Preparing PDF…' : 'Download PDF'}</button></div>
      <div className={styles.printViewport}><EventBudgetPrintDocument ref={printRootRef} eventName={event.name} eventDate={event.date} currency={currency} expenses={data.expenses} summary={summary} generatedAt={generatedAt} /></div>
    </DialogContent></Dialog>
  </section>;
};
