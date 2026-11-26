import { RecordActionHeading, RecordActionPair } from '../RecordActionPair';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Printer as ExportControlsPrinter } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, CheckCircle2, Clock3, Download, Plus, Printer, Trash2,
  Search, WalletCards, LoaderCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useEventBudget,type EventBudgetData } from '@/hooks/useEventBudget';
import {
  calculateBudgetSummary, EVENT_BUDGET_CATEGORIES, type BudgetPaymentStatus,
  type EventBudgetExpense, type EventBudgetExpenseInput, expenseOutstanding,
  formatAustralianDate, formatBudgetCurrency, formatBudgetInput, getBudgetPaymentStatus, parseCurrencyInput,
  resolveEventBudgetCurrency,
} from '@/lib/eventBudget';
import type { CurrencyCode } from '@/lib/currencyPricing';
import { CURRENCY_PREFIX } from '@/lib/liveCurrencyPricing';
import { createEventBudgetPdf, exportEventBudgetPdf } from '@/lib/eventBudgetPdfExporter';
import { openPdfPrintFrame, type PdfPrintJob } from '@/lib/pdfPrint';
import { ExpenseDrawer } from './ExpenseDrawer';
import { EventBudgetPrintDocument } from './EventBudgetPrintDocument';
import styles from './EventBudgetPlanner.module.css';
import { BUDGET_LABELS, type BudgetChoice } from '@/lib/guidedEventSetup';

export interface BudgetPlannerEvent { id: string; name: string; date?: string | null }
export interface BudgetPlannerController {
 query:{data?:EventBudgetData;isLoading:boolean;isError:boolean;refetch:()=>Promise<unknown>};
 saveBudget:{isPending:boolean;mutateAsync:(input:{anticipatedBudget:number;currency:CurrencyCode})=>Promise<unknown>};
 saveExpense:{isPending:boolean;mutateAsync:(input:{id?:string;input:EventBudgetExpenseInput})=>Promise<unknown>};
 deleteExpense:{isPending:boolean;mutateAsync:(id:string)=>Promise<unknown>};
}
type SortKey = 'category' | 'expense' | 'estimated' | 'actual' | 'paid' | 'outstanding' | 'due';

const STATUS_OPTIONS: Array<'All Statuses' | BudgetPaymentStatus> = ['All Statuses', 'Unpaid', 'Part Paid', 'Paid', 'Due Soon', 'Overdue'];
const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['category', 'Category'], ['expense', 'Business Name'], ['estimated', 'Budgeted Cost'],
  ['actual', 'Actual Cost'], ['paid', 'Amount Paid'], ['outstanding', 'Amount Outstanding'], ['due', 'Balance Due Date'],
];

const expenseCategory = (expense: EventBudgetExpense): string => expense.category === 'Other' ? expense.custom_category || 'Other' : expense.category;
const expenseTitle = (expense: EventBudgetExpense): string => expense.vendor_name || expense.expense_name || expenseCategory(expense);
const formatBudgetDisplay = formatBudgetCurrency;

const MoneyBagIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={styles.moneyBagIcon}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8.25 6.5h7.5l1.5-3h-10.5l1.5 3Z" />
    <path d="M8.5 6.5c-2.75 2.1-4.5 5.25-4.5 8.1 0 3.9 3.05 5.9 8 5.9s8-2 8-5.9c0-2.85-1.75-6-4.5-8.1" />
    <path d="M9.25 11.25c0-1 1.1-1.75 2.75-1.75s2.75.75 2.75 1.75-1.1 1.75-2.75 1.75-2.75.75-2.75 1.75 1.1 1.75 2.75 1.75 2.75-.75 2.75-1.75M12 8v10" />
  </svg>
);

export const EventBudgetPlanner: React.FC<{ event: BudgetPlannerEvent; exportTarget?: HTMLElement | null }> = ({ event, exportTarget }) => {
  const controller=useEventBudget(event.id);
  return <EventBudgetPlannerView event={event} exportTarget={exportTarget} controller={controller}/>;
};
export const EventBudgetPlannerView: React.FC<{event:BudgetPlannerEvent;exportTarget?:HTMLElement|null;controller:BudgetPlannerController;readOnly?:boolean}> = ({event,exportTarget,controller,readOnly=false}) => {
  const { toast } = useToast();
  const { query, saveBudget, saveExpense, deleteExpense } = controller;
  const data = query.data ?? { settings: null, expenses: [] };
  const [budgetInput, setBudgetInput] = React.useState('');
  const [budgetState, setBudgetState] = React.useState<'idle' | 'saved' | 'error'>('idle');
  const [budgetError, setBudgetError] = React.useState('');
  const [currency, setCurrency] = React.useState<CurrencyCode>('AUD');
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('All Categories');
  const [status, setStatus] = React.useState<'All Statuses' | BudgetPaymentStatus>('All Statuses');
  const [sort, setSort] = React.useState<SortKey>('category');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<EventBudgetExpense | null>(null);
  const [pendingDeletion, setPendingDeletion] = React.useState<EventBudgetExpense | null>(null);
  const [rowDeleteError, setRowDeleteError] = React.useState('');
  const [rowDeleting, setRowDeleting] = React.useState(false);
  const rowDeleteLock = React.useRef(false);
  const [printOpen, setPrintOpen] = React.useState(false);
  const [pendingPrintAction, setPendingPrintAction] = React.useState<'print' | 'download' | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [generatedAt, setGeneratedAt] = React.useState(() => new Date());
  const addButtonRef = React.useRef<HTMLButtonElement>(null);
  const drawerReturnRef = React.useRef<HTMLButtonElement>(null);
  const [previewRoot, setPreviewRoot] = React.useState<HTMLDivElement | null>(null);
  const [directPrintRoot, setDirectPrintRoot] = React.useState<HTMLDivElement | null>(null);
  const printRoot = pendingPrintAction === 'print' ? directPrintRoot : previewRoot;
  const printJobLock = React.useRef(false);

  React.useEffect(() => {
    const resolvedCurrency = resolveEventBudgetCurrency(data.settings?.currency);
    setCurrency(resolvedCurrency);
    setBudgetInput(data.settings?.planned_budget_kind === 'exact' ? formatBudgetInput(resolvedCurrency, Number(data.settings.anticipated_budget)) : '');
    setBudgetState('idle'); setBudgetError('');
  }, [data.settings, event.id]);

  React.useEffect(() => { setDrawerOpen(false); setEditingExpense(null); setPendingDeletion(null); setRowDeleteError(''); }, [event.id]);

  const hasLegacyCurrency = Boolean(data.settings && currency !== 'AUD');

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
    if(readOnly)return;
    const value = parseCurrencyInput(budgetInput);
    if (value === null || value <= 0) { setBudgetState('error'); setBudgetError(`Enter a valid positive ${currency} amount with up to two decimal places.`); return; }
    setBudgetError(''); setBudgetState('idle');
    try {
      if (hasLegacyCurrency) throw new Error('This historical budget uses a non-AUD currency and has not been changed. Choose a conversion approach before editing it.');
      await saveBudget.mutateAsync({ anticipatedBudget: value, currency: 'AUD' }); setBudgetState('saved');
      setBudgetInput(formatBudgetInput(currency, value));
      toast({ title: 'Budget saved', description: `${event.name}'s anticipated budget is now ${formatBudgetDisplay(currency, value)} AUD.` });
    } catch (error) {
      setBudgetState('error'); setBudgetError(error instanceof Error ? error.message : 'The budget could not be saved. Your value has been preserved.');
    }
  };

  const openAdd = (source: React.RefObject<HTMLButtonElement>) => { if (readOnly||hasLegacyCurrency) return; drawerReturnRef.current = source.current; setEditingExpense(null); setDrawerOpen(true); };
  const openEdit = (expense: EventBudgetExpense, button: HTMLButtonElement) => { if (readOnly||hasLegacyCurrency) return; drawerReturnRef.current = button; setEditingExpense(expense); setDrawerOpen(true); };

  const handleSaveExpense = async (input: EventBudgetExpenseInput) => {
    if(readOnly)return;
    await saveExpense.mutateAsync({ id: editingExpense?.id, input });
    toast({ title: editingExpense ? 'Expense updated' : 'Expense added', description: `${input.vendor_name || input.expense_name || input.custom_category || input.category} was saved to ${event.name}.` });
    setDrawerOpen(false); setEditingExpense(null);
  };
  const handleDeleteExpense = async (expense = editingExpense) => {
    if(readOnly || hasLegacyCurrency || !expense)return;
    await deleteExpense.mutateAsync(expense.id);
    toast({ title: 'Expense deleted', description: `${expenseTitle(expense)} was removed from ${event.name}.` });
    setDrawerOpen(false); setEditingExpense(null);
  };

  const openDelete = (expense: EventBudgetExpense, button: HTMLButtonElement) => {
    if (readOnly || hasLegacyCurrency || deleteExpense.isPending || rowDeleteLock.current) return;
    drawerReturnRef.current = button; setRowDeleteError(''); setPendingDeletion(expense);
  };
  const confirmRowDelete = async () => {
    if (!pendingDeletion || readOnly || hasLegacyCurrency || rowDeleteLock.current || deleteExpense.isPending) return;
    rowDeleteLock.current = true; setRowDeleting(true); setRowDeleteError('');
    try { await handleDeleteExpense(pendingDeletion); setPendingDeletion(null); }
    catch (error) { setRowDeleteError(error instanceof Error ? error.message : 'The expense could not be deleted. Please try again.'); }
    finally { rowDeleteLock.current = false; setRowDeleting(false); }
  };

  const printEvent = React.useRef(event.id); printEvent.current = event.id;
  const requestPrintAction = (action: 'print' | 'download') => { if(exporting||printJobLock.current)return; setGeneratedAt(new Date()); setPendingPrintAction(action); setPrintOpen(true); };
  React.useEffect(() => {
    if (!printOpen || !pendingPrintAction || !printRoot?.isConnected) return;
    const timer = window.setTimeout(async () => {
      if(printJobLock.current)return;printJobLock.current=true;
      const id=event.id,isCurrent=()=>printEvent.current===id&&printRoot.isConnected;
      let job:PdfPrintJob|undefined;
      setExporting(true);
      try {
        if(pendingPrintAction==='print'){
          const pdf=await createEventBudgetPdf(printRoot);
          if(!isCurrent())throw Error('The selected event changed. Please print again.');
          job=openPdfPrintFrame();
          await job.print(pdf.output('blob'),isCurrent);
        } else await exportEventBudgetPdf(printRoot,event.name);
      } catch(error){job?.close();toast({title:pendingPrintAction==='print'?'Print Failed':'PDF export failed',description:error instanceof Error?error.message:'Please try again.',variant:'destructive'});}
      finally{printJobLock.current=false;setExporting(false);if(pendingPrintAction==='print')setPrintOpen(false);setPendingPrintAction(null);}
    }, 80);
    return () => window.clearTimeout(timer);
  }, [event.id, event.name, pendingPrintAction, printOpen, printRoot, toast]);

  const statusIcon = (value: BudgetPaymentStatus) => value === 'Paid' ? <CheckCircle2 size={14} /> : value === 'Overdue' ? <AlertCircle size={14} /> : <Clock3 size={14} />;

  const exportControls = <section data-export-controls-panel className={styles.exportPanel} aria-label="Export Controls">
    <span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span>
      <div className={styles.topActions}>
        <button type="button" className={`${styles.successButton} ${styles.exportAction}`} onClick={() => requestPrintAction('print')} disabled={query.isLoading || exporting}>{exporting && pendingPrintAction==='print'?<LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>:<Printer size={16} aria-hidden="true" />}Print Budget</button>
        <button type="button" className={`${styles.successButton} ${styles.exportAction}`} onClick={() => requestPrintAction('download')} disabled={query.isLoading || exporting}><Download size={16} aria-hidden="true" />{exporting && pendingPrintAction==='download' ? 'Preparing PDF…' : 'Download PDF'}</button>
      </div>
  </section>;

  return <section className={styles.planner} aria-labelledby="event-budget-heading">
    {exportTarget && createPortal(exportControls, exportTarget)}
    <div className={styles.plannerHeading}>
      <div className={styles.headingGroup}><WalletCards size={25} strokeWidth={1.8} className={styles.headingIcon} aria-hidden="true" /><div><h2 id="event-budget-heading">Your Event Budget</h2><p>Plan your event spending, track payments and stay on budget.</p></div></div>
          <button type="button" className={`${styles.successButton} ${styles.exportAction}`} onClick={() => void saveAnticipatedBudget()} disabled={readOnly || saveBudget.isPending || hasLegacyCurrency}><MoneyBagIcon />{saveBudget.isPending ? 'Saving…' : data.settings ? 'Update Budget' : 'Save Budget'}</button>
      {!exportTarget && exportControls}
    </div>

    <div className={styles.budgetPanel} data-budget-panel>
      <div className={styles.budgetCopy}>
        {data.settings?.planned_budget_kind === 'range' && <p role="status">Guided setup estimate: {BUDGET_LABELS[data.settings.planned_budget_range as BudgetChoice] || data.settings.planned_budget_range}. Enter an exact amount whenever you are ready.</p>}
        {data.settings?.planned_budget_kind === 'undecided' && <p role="status">Your planned budget is not decided yet. Enter an exact amount whenever you are ready.</p>}
      </div>
      <div className={styles.summaryGrid} aria-label="Event budget summary">
        {[
          ['Total Budget', summary.totalBudget, 'neutral'], ['Budgeted Costs', summary.estimatedCosts, 'info'],
          ['Actual Costs', summary.actualCosts, 'neutral'], ['Amount Paid', summary.amountPaid, 'success'],
          ['Amount Outstanding', summary.amountOutstanding, summary.amountOutstanding > 0 ? 'warning' : 'success'],
          [summary.budgetRemaining < 0 ? 'Over Budget' : 'Budget Remaining', Math.abs(summary.budgetRemaining), summary.budgetRemaining < 0 ? 'danger' : lowBudget ? 'warning' : 'success'],
        ].map(([label, value, tone]) => <article key={String(label)} className={styles.summaryCard} data-tone={tone}>
          <span>{label}</span>
          {label === 'Total Budget' ? <label className={styles.summaryBudgetInput}>
            <span aria-hidden="true">{currency === 'AUD' ? '$' : CURRENCY_PREFIX[currency]}</span>
            <input className={`${styles.borderlessBudgetInput} border-0`} id="anticipated-event-budget" aria-label="Total Anticipated Event Budget" disabled={readOnly || hasLegacyCurrency} inputMode="decimal" value={budgetInput} onChange={event => { setBudgetInput(event.target.value); setBudgetState('idle'); setBudgetError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void saveAnticipatedBudget(); } }} aria-invalid={budgetState === 'error'} />
          </label> : <strong>{formatBudgetDisplay(currency, Number(value))}</strong>}
          {label === 'Over Budget' && <small>Committed costs exceed the saved budget</small>}
        </article>)}
      </div>
      <div className={styles.budgetFeedback} aria-live="polite">{hasLegacyCurrency && <span data-state="error"><AlertCircle size={14} />Historical {currency} budget preserved unchanged. Editing is paused until a conversion approach is approved.</span>}{budgetState === 'saved' && <span data-state="saved"><CheckCircle2 size={14} />Saved</span>}{budgetError && <span data-state="error"><AlertCircle size={14} />{budgetError}</span>}</div>
    </div>

    <div className={styles.expensePanel}>
      <div className={styles.controls}>
        <label className={styles.searchField}><span className="sr-only">Search expenses</span><Search size={16} /><input type="search" placeholder="Search expenses, businesses or contacts" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label><span className="sr-only">Filter by category</span><select value={category} onChange={event => setCategory(event.target.value)}><option>All Categories</option>{EVENT_BUDGET_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Filter by payment status</span><select value={status} onChange={event => setStatus(event.target.value as typeof status)}>{STATUS_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Sort expenses</span><select value={sort} onChange={event => setSort(event.target.value as SortKey)}>{SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>Sort: {label}</option>)}</select></label>
        <button ref={addButtonRef} type="button" className={styles.successButton} disabled={readOnly} onClick={() => openAdd(addButtonRef)}><Plus size={17} aria-hidden="true" />Add Expense</button>
      </div>

      {query.isLoading && <div className={styles.loadingState} aria-live="polite"><span className={styles.spinner} />Loading {event.name}'s budget…</div>}
      {query.isError && <div className={styles.errorState} role="alert"><AlertCircle size={18} />The budget could not be loaded. <button onClick={() => void query.refetch()}>Try again</button></div>}
      {!query.isLoading && !query.isError && data.expenses.length === 0 && <div className={styles.emptyState}><WalletCards size={30} /><h3>No expenses added yet</h3><p>Add your first anticipated cost, vendor or payment to begin planning your event budget.</p><button ref={drawerReturnRef} type="button" className={styles.successButton} disabled={readOnly} onClick={() => openAdd(drawerReturnRef)}><Plus size={17} />Add Expense</button></div>}
      {!query.isLoading && !query.isError && data.expenses.length > 0 && visibleExpenses.length === 0 && <div className={styles.emptyState}><Search size={28} /><h3>No matching expenses</h3><p>Try changing your search, category or payment-status filters.</p></div>}

      {visibleExpenses.length > 0 && <>
        <div className={styles.tableRegion} aria-label="Event budget expenses table">
          <table className={styles.expenseTable}><colgroup><col className={styles.categoryColumn}/><col className={styles.businessColumn}/><col className={styles.contactColumn}/><col className={styles.budgetedColumn}/><col className={styles.actualColumn}/><col className={styles.paidColumn}/><col className={styles.outstandingColumn}/><col className={styles.dateColumn}/><col className={styles.dateColumn}/><col className={styles.notesColumn}/><col className={styles.statusColumn}/><col className={styles.actionsColumn}/></colgroup><thead><tr><th className={styles.textHeaderColumn}>Category</th><th className={styles.textHeaderColumn}>Business Name</th><th className={styles.textHeaderColumn}>Contact Details</th><th className={styles.centeredColumn}>Budgeted Cost</th><th className={styles.centeredColumn}>Actual Cost</th><th className={styles.centeredColumn}>Amount Paid</th><th className={styles.centeredColumn}>Amount Outstanding</th><th className={styles.centeredColumn}>Payment Date</th><th className={styles.centeredColumn}>Balance Due</th><th className={styles.centeredColumn}>Notes</th><th className={styles.centeredColumn}>Status</th><th className={styles.centeredColumn}><RecordActionHeading /></th></tr></thead>
            <tbody>{visibleExpenses.map(expense => { const paymentStatus = getBudgetPaymentStatus(expense); return <tr key={expense.id}>
              <td className={styles.textColumn}>{expenseCategory(expense)}</td><td className={styles.textColumn}><strong>{expenseTitle(expense)}</strong></td>
              <td className={styles.textColumn}>{[expense.contact_person, expense.phone, expense.email, expense.address].filter(Boolean).map(line => <span key={line}>{line}</span>)}</td>
              <td className={`${styles.money} ${styles.centeredColumn}`}>{expense.estimated_cost === null ? '—' : formatBudgetDisplay(currency, expense.estimated_cost)}</td><td className={`${styles.money} ${styles.centeredColumn}`}>{expense.actual_cost === null ? '—' : formatBudgetDisplay(currency, expense.actual_cost)}</td>
              <td className={`${styles.money} ${styles.centeredColumn}`}>{formatBudgetDisplay(currency, expense.amount_paid)}</td><td className={`${styles.money} ${styles.centeredColumn}`}>{formatBudgetDisplay(currency, expenseOutstanding(expense))}</td>
              <td className={styles.centeredColumn}>{formatAustralianDate(expense.payment_date)}</td><td className={styles.centeredColumn}>{formatAustralianDate(expense.balance_due_date)}</td><td className={styles.centeredColumn}>{expense.notes?.trim() ? 'Yes' : 'No'}</td>
              <td className={styles.centeredColumn}><span className={styles.statusPill} data-status={paymentStatus}>{statusIcon(paymentStatus)}{paymentStatus}</span></td>
              <td className={styles.centeredColumn}><RecordActionPair showLabels editLabel={`Edit ${expenseTitle(expense)}`} deleteLabel={`Delete ${expenseTitle(expense)}`} disabled={readOnly || hasLegacyCurrency || deleteExpense.isPending || rowDeleting} onEdit={event => openEdit(expense, event.currentTarget)} onDelete={event => openDelete(expense, event.currentTarget)} /></td>
            </tr>; })}</tbody><tfoot aria-hidden="true" className={styles.expenseFooter}><tr><td colSpan={12} /></tr></tfoot></table>
        </div>
        <div className={styles.mobileExpenses}>{visibleExpenses.map(expense => { const paymentStatus = getBudgetPaymentStatus(expense); return <article key={expense.id} className={styles.mobileExpenseCard}>
          <div className={styles.mobileCardHeading}><div><span>{expenseCategory(expense)}</span><h3>{expenseTitle(expense)}</h3>{expense.vendor_name && expense.vendor_name !== expenseTitle(expense) && <p>{expense.vendor_name}</p>}</div><span className={styles.statusPill} data-status={paymentStatus}>{statusIcon(paymentStatus)}{paymentStatus}</span></div>
          <dl><div><dt>Budgeted Cost</dt><dd>{formatBudgetDisplay(currency, expense.estimated_cost ?? 0)}</dd></div><div><dt>Paid</dt><dd>{formatBudgetDisplay(currency, expense.amount_paid)}</dd></div><div><dt>Outstanding</dt><dd>{formatBudgetDisplay(currency, expenseOutstanding(expense))}</dd></div><div><dt>Balance Due</dt><dd>{formatAustralianDate(expense.balance_due_date)}</dd></div></dl>
          <details><summary>View Details</summary><p>{[expense.contact_person, expense.phone, expense.email, expense.address, expense.notes].filter(Boolean).join(' · ') || 'No additional details.'}</p></details>
          <RecordActionPair showLabels editLabel={`Edit ${expenseTitle(expense)}`} deleteLabel={`Delete ${expenseTitle(expense)}`} disabled={readOnly || hasLegacyCurrency || deleteExpense.isPending || rowDeleting} onEdit={event => openEdit(expense, event.currentTarget)} onDelete={event => openDelete(expense, event.currentTarget)} />
        </article>; })}</div>
      </>}
    </div>

    {!readOnly && <AlertDialog open={pendingDeletion !== null} onOpenChange={open => { if (!open && !rowDeleting && !deleteExpense.isPending) { setPendingDeletion(null); setRowDeleteError(''); } }}>
      <AlertDialogContent className={styles.confirmDialog} onCloseAutoFocus={event => { event.preventDefault(); const target = drawerReturnRef.current; if (target?.isConnected) target.focus(); else addButtonRef.current?.focus(); }}>
        <AlertDialogHeader><AlertDialogTitle>Delete this expense?</AlertDialogTitle><AlertDialogDescription>{pendingDeletion ? expenseTitle(pendingDeletion) : 'This expense'} will be permanently removed from this event budget.</AlertDialogDescription></AlertDialogHeader>
        {rowDeleteError && <p className={styles.formError} role="alert">{rowDeleteError}</p>}
        <AlertDialogFooter className={styles.confirmActions}>
          <AlertDialogCancel className={styles.secondaryButton} disabled={rowDeleting || deleteExpense.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction className={styles.dangerButton} disabled={rowDeleting || deleteExpense.isPending} onClick={event => { event.preventDefault(); void confirmRowDelete(); }}><Trash2 size={16} aria-hidden="true" />{rowDeleting || deleteExpense.isPending ? 'Deleting…' : 'Delete Expense'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}
    {!readOnly&&<ExpenseDrawer open={drawerOpen} eventId={event.id} currency={currency} expense={editingExpense} saving={saveExpense.isPending} deleting={deleteExpense.isPending} returnFocusRef={drawerReturnRef} onSave={handleSaveExpense} onDelete={() => handleDeleteExpense()} onClose={() => { setDrawerOpen(false); setEditingExpense(null); }} />}



    {printOpen && pendingPrintAction==='print' && createPortal(<div aria-hidden="true" style={{position:'fixed',left:-100000,top:0,width:1123,pointerEvents:'none'}}>
      <EventBudgetPrintDocument ref={setDirectPrintRoot} eventName={event.name} eventDate={event.date} currency={currency} expenses={data.expenses} summary={summary} generatedAt={generatedAt} />
    </div>,document.body)}
    <Dialog open={printOpen && pendingPrintAction!=='print'} onOpenChange={setPrintOpen}><DialogContent className={styles.printDialog} data-budget-print-preview>
      <DialogHeader><DialogTitle>Event Budget Planner Preview</DialogTitle><DialogDescription>This authoritative A4 landscape preview is used for both browser print and PDF.</DialogDescription></DialogHeader>
      <div className={styles.printDialogActions}><button className={styles.secondaryButton} onClick={() => requestPrintAction('print')} disabled={exporting}>{exporting && pendingPrintAction==='print'?<LoaderCircle size={16} className="animate-spin"/>:<Printer size={16}/>}Print Budget</button><button className={styles.successButton} onClick={() => requestPrintAction('download')} disabled={exporting}><Download size={16} />{exporting && pendingPrintAction==='download' ? 'Preparing PDF…' : 'Download PDF'}</button></div>
      <div className={styles.printViewport} data-budget-print-viewport><EventBudgetPrintDocument ref={setPreviewRoot} eventName={event.name} eventDate={event.date} currency={currency} expenses={data.expenses} summary={summary} generatedAt={generatedAt} /></div>
    </DialogContent></Dialog>
  </section>;
};




