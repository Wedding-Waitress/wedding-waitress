import React from 'react';
import {
  type EventBudgetExpense, type EventBudgetSummary, expenseOutstanding, formatBudgetCurrency,
  formatAustralianDate, getBudgetPaymentStatus,
} from '@/lib/eventBudget';
import type { CurrencyCode } from '@/lib/currencyPricing';
import styles from './EventBudgetPrintDocument.module.css';

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
  const pages = paginateBudgetExpenses(expenses);
  const remainingLabel = summary.budgetRemaining < 0 ? 'Over Budget' : 'Budget Remaining';
  const remainingValue = Math.abs(summary.budgetRemaining);
  const generated = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt);

  return <div ref={ref} className={styles.document} data-budget-print-document-root="true">
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
          <div><h1>{eventName}</h1><h2>Event Budget Planner</h2>{eventDate && <p>{formatAustralianDate(eventDate)}</p>}</div>
          <div className={styles.headerBudget}><span>Total Anticipated Budget · {currency}</span><strong>{formatBudgetCurrency(currency, summary.totalBudget)}</strong></div>
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

        <footer className={styles.footer}><span>Generated {generated}</span><img src="/wedding-waitress-logo-brown.png" alt="Wedding Waitress" /><span>Page {pageIndex + 1} of {pages.length}</span></footer>
      </article>
    </div>)}
  </div>;
});
EventBudgetPrintDocument.displayName = 'EventBudgetPrintDocument';
