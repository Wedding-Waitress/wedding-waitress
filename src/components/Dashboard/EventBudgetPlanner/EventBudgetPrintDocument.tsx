import React from 'react';
import {
  type EventBudgetExpense, type EventBudgetSummary, expenseOutstanding, formatBudgetCurrency,
  formatAustralianDate, getBudgetPaymentStatus,
} from '@/lib/eventBudget';
import type { CurrencyCode } from '@/lib/currencyPricing';
import styles from './EventBudgetPrintDocument.module.css';
import { DOCUMENT_EVENT_TITLE_STYLE } from '@/lib/documentEventTitle';

export const EVENT_BUDGET_ROWS_PER_PAGE = 6;

export interface EventBudgetPrintDocumentProps {
  eventName: string;
  eventDate?: string | null;
  currency: CurrencyCode;
  expenses: EventBudgetExpense[];
  summary: EventBudgetSummary;
  generatedAt: Date;
}

export const paginateBudgetExpenses = (expenses: EventBudgetExpense[], rowsPerPage = EVENT_BUDGET_ROWS_PER_PAGE): EventBudgetExpense[][] => {
  if (expenses.length === 0) return [[]];
  const pages: EventBudgetExpense[][] = [];
  for (let index = 0; index < expenses.length; index += rowsPerPage) pages.push(expenses.slice(index, index + rowsPerPage));
  return pages;
};

const contactLines = (expense: EventBudgetExpense): string[] =>
  [expense.contact_person, expense.phone, expense.email, expense.address].filter((value): value is string => Boolean(value));

export const EventBudgetPrintDocument = React.forwardRef<HTMLDivElement, EventBudgetPrintDocumentProps>(({
  eventName, eventDate, currency, expenses, summary, generatedAt,
}, ref) => {
  const documentRef = React.useRef<HTMLDivElement | null>(null);
  const setDocumentRef = React.useCallback((node: HTMLDivElement | null) => {
    documentRef.current = node;
    if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  }, [ref]);
  const [pageSizes, setPageSizes] = React.useState<number[] | null>(null);
  let start = 0;
  const pages = pageSizes && pageSizes.reduce((sum, size) => sum + size, 0) === expenses.length
    ? pageSizes.map(size => { const page = expenses.slice(start, start + size); start += size; return page; })
    : paginateBudgetExpenses(expenses);

  // Measure the authoritative rows at their intrinsic paper width. A long
  // contact block moves the whole row to the next page rather than clipping it.
  React.useLayoutEffect(() => {
    const root = documentRef.current;
    if (!root || !expenses.length) return;
    const measure = () => {
      const page = root.querySelector<HTMLElement>('[data-print-mirror-document="event-budget"]');
      if (!page || !page.clientHeight) return;
      const style = getComputedStyle(page);
      const footer = page.querySelector<HTMLElement>('footer')!;
      const footerStyle = getComputedStyle(footer);
      const capacity = page.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
        - page.querySelector('header')!.getBoundingClientRect().height
        - page.querySelector('section')!.getBoundingClientRect().height
        - page.querySelector('thead')!.getBoundingClientRect().height
        - parseFloat(footerStyle.minHeight) - parseFloat(footerStyle.paddingTop) - 2;
      const sizes: number[] = [];
      let count = 0;
      let height = 0;
      root.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row => {
        const rowHeight = row.getBoundingClientRect().height;
        if (count && (count === EVENT_BUDGET_ROWS_PER_PAGE || height + rowHeight > capacity)) {
          sizes.push(count); count = 0; height = 0;
        }
        count += 1; height += rowHeight;
      });
      if (count) sizes.push(count);
      setPageSizes(previous => JSON.stringify(previous) === JSON.stringify(sizes) ? previous : sizes);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    root.querySelectorAll('tbody tr').forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, [expenses, eventName, eventDate, currency, summary, pageSizes]);
  const remainingLabel = summary.budgetRemaining < 0 ? 'Over Budget' : 'Budget Remaining';
  const remainingValue = Math.abs(summary.budgetRemaining);
  const generated = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt);

  return <div ref={setDocumentRef} className={styles.document} data-budget-print-document-root="true">
    {pages.map((pageExpenses, pageIndex) => <div key={pageIndex} className={styles.presentation} data-print-mirror-presentation="true">
      <article
        className={styles.page}
        data-print-mirror-document="event-budget"
        data-print-mirror-paper="A4"
        data-print-mirror-orientation="landscape"
        data-print-mirror-width-mm="297"
        data-print-mirror-height-mm="210"
      >
        <header className={styles.header}>
          <div><h1 data-document-event-title style={DOCUMENT_EVENT_TITLE_STYLE}>{eventName}</h1><h2>Event Budget Planner</h2>{eventDate && <p>{formatAustralianDate(eventDate)}</p>}</div>
          <div className={styles.headerBudget}><span>Total Anticipated Budget</span><strong>{formatBudgetCurrency(currency, summary.totalBudget)}</strong></div>
        </header>

        <section className={styles.summary} aria-label="Budget summary">
          {[
            ['Total Budget', summary.totalBudget], ['Budgeted Costs', summary.estimatedCosts],
            ['Actual Costs', summary.actualCosts], ['Amount Paid', summary.amountPaid],
            ['Amount Outstanding', summary.amountOutstanding], [remainingLabel, remainingValue],
          ].map(([label, value]) => <div key={String(label)} data-negative={label === 'Over Budget'}><span>{label}</span><strong>{formatBudgetCurrency(currency, Number(value))}</strong></div>)}
        </section>

        <table className={styles.table}>
          <thead><tr><th>Category</th><th>Business Name</th><th>Contact Details</th><th>Budgeted</th><th>Actual</th><th>Paid</th><th>Outstanding</th><th>Payment</th><th>Balance Due</th><th>Status</th></tr></thead>
          <tbody>{pageExpenses.length === 0 ? <tr><td colSpan={10} className={styles.empty}>No expenses added yet</td></tr> : pageExpenses.map(expense => <tr key={expense.id}>
            <td>{expense.category === 'Other' ? expense.custom_category || 'Other' : expense.category}</td>
            <td><strong>{expense.vendor_name || expense.expense_name || expense.custom_category || expense.category}</strong></td>
            <td>{contactLines(expense).length ? contactLines(expense).map(line => <span key={line}>{line}</span>) : '—'}</td>
            <td className={styles.money}>{expense.estimated_cost === null ? '—' : formatBudgetCurrency(currency, expense.estimated_cost)}</td>
            <td className={styles.money}>{expense.actual_cost === null ? '—' : formatBudgetCurrency(currency, expense.actual_cost)}</td>
            <td className={styles.money}>{formatBudgetCurrency(currency, expense.amount_paid)}</td>
            <td className={styles.money}>{formatBudgetCurrency(currency, expenseOutstanding(expense))}</td>
            <td>{formatAustralianDate(expense.payment_date)}</td><td>{formatAustralianDate(expense.balance_due_date)}</td>
            <td><strong>{getBudgetPaymentStatus(expense)}</strong></td>
          </tr>)}</tbody>
        </table>

        <footer className={styles.footer}><span>Generated {generated}</span><img src="/wedding-waitress-document-footer-print.png" alt="Wedding Waitress" /><span>Page {pageIndex + 1} of {pages.length}</span></footer>
      </article>
    </div>)}
  </div>;
});
EventBudgetPrintDocument.displayName = 'EventBudgetPrintDocument';
