import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const component = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/EventBudgetPlanner.tsx'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/EventBudgetPlanner.module.css'), 'utf8');
const printCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/EventBudgetPrintDocument.module.css'), 'utf8');
const dashboard = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.tsx'), 'utf8');
const drawer = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/ExpenseDrawer.tsx'), 'utf8');

describe('Event Budget Planner layout contract', () => {
  it('is placed after the unchanged overview grid and only renders for the selected loaded event', () => {
    expect(dashboard.indexOf('<EventBudgetPlanner event={selectedEvent} />')).toBeGreaterThan(dashboard.indexOf('className={styles.cardGrid}'));
    expect(dashboard).toContain('{selectedEvent && data && !loading && <EventBudgetPlanner event={selectedEvent} />}');
    expect(dashboard.match(/Event Overview|Guest List|Tables &amp; Seating|Dietary Requirements|Needs Attention|Wedding Setup Progress/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('matches the Dashboard heading typography and provides six summary cards', () => {
    expect(css).toMatch(/\.plannerHeading h2 \{[^}]*font-size: 24px;[^}]*font-weight: 600;[^}]*line-height: 1\.25/);
    expect(component).toContain('Plan your event spending, track payments and stay on budget.');
    expect(component).toContain("['Total Budget', summary.totalBudget");
    expect(component).toContain("['Amount Outstanding', summary.amountOutstanding");
    expect(component).toContain("summary.budgetRemaining < 0 ? 'Over Budget' : 'Budget Remaining'");
  });

  it('uses a parent section card, green heading actions, compact separate budget controls and toolbar Add action', () => {
    expect(css).toMatch(/\.planner \{[^}]*padding: 1rem;[^}]*border: 1px solid var\(--dashboard-border\);[^}]*background: var\(--dashboard-panel\)/);
    expect(component).toContain('className={styles.successButton} onClick={() => requestPrintAction(\'print\')}');
    expect(component).toContain('className={styles.successButton} onClick={() => requestPrintAction(\'download\')}');
    expect(css).toMatch(/\.amountControl \{[^}]*width: clamp\(15rem,22vw,20rem\)/);
    expect(component.indexOf('id="event-budget-currency"')).toBeGreaterThan(component.indexOf('id="anticipated-event-budget"'));
    expect(component.indexOf('ref={addButtonRef}')).toBeGreaterThan(component.indexOf('Sort expenses'));
  });

  it('fits the complete desktop table without horizontal scrolling and switches to cards before tablet widths become cramped', () => {
    expect(css).toMatch(/\.tableRegion \{[^}]*width: 100%;[^}]*max-width: 100%/);
    expect(css).toMatch(/\.expenseTable \{[^}]*width: 100%;[^}]*table-layout: fixed/);
    expect(css).not.toMatch(/\.expenseTable \{[^}]*min-width:/);
    expect(css).toMatch(/@media \(max-width: 70rem\)[\s\S]*\.tableRegion \{ display: none; \}[\s\S]*\.mobileExpenses \{ display: grid/);
    expect(css).toMatch(/\.planner \{[^}]*min-width: 0/);
    expect(component).toContain('<details><summary>View Details</summary>');
  });

  it('uses controlled percentage columns, safe contact wrapping and compact non-wrapping values', () => {
    expect(css).toContain('.expenseTable th:nth-child(1) { width: 8%; }');
    expect(css).toContain('.expenseTable th:nth-child(3) { width: 16%; }');
    expect(css).toContain('.expenseTable th:nth-child(11) { width: 7.5%; }');
    expect(css).toMatch(/\.expenseTable td \{[^}]*overflow-wrap: anywhere;[^}]*word-break: break-word/);
    expect(css).toMatch(/\.expenseTable \.money \{[^}]*white-space: nowrap/);
    expect(css).toMatch(/\.expenseTable th \{[^}]*color: var\(--dashboard-text\);[^}]*opacity: 1/);
  });

  it('uses borderless solid semantic controls with white content and reduced-motion support', () => {
    expect(css).toMatch(/\.successButton \{[^}]*border: 0 !important;[^}]*color: #FFFFFF !important;[^}]*#4ade80[^}]*#22c55e[^}]*#16a34a/);
    expect(css).toMatch(/\.dangerButton \{[^}]*border: 0 !important;[^}]*color: #FFFFFF !important;[^}]*#f87171[^}]*#ef4444[^}]*#dc2626/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('uses the approved green treatment for Edit without changing the drawer action treatments', () => {
    expect(component).toContain('className={`${styles.successButton} ${styles.tableEditButton}`} aria-label={`Edit ${expenseTitle(expense)}`}');
    expect(css).toMatch(/\.tableEditButton \{[^}]*min-height: 1\.9rem;[^}]*font-size: 10px;[^}]*white-space: nowrap/);
    expect(drawer).toContain('className={styles.dangerButton} onClick={requestClose}');
    expect(drawer).toContain('<X size={16} aria-hidden="true" />Cancel');
    expect(drawer).toContain("className={styles.successButton} disabled={saving || deleting}");
  });

  it('keeps only the approved user-facing budget terminology', () => {
    expect(component).toContain('Budgeted Costs');
    expect(component).toContain('<th>Business Name</th>');
    expect(component).toContain('<th>Budgeted Cost</th>');
    expect(component).not.toMatch(/Estimated Cost|Estimated Costs|Expense \/ Vendor/);
  });

  it('uses opaque champagne-gold drawer fields with stronger hover, espresso focus and red validation precedence', () => {
    expect(css).toContain('--budget-field-border: #cdb99e');
    expect(css).toContain('--budget-field-border-hover: #a18764');
    expect(css).toContain('--budget-field-border-focus: #2b1711');
    expect(css).toMatch(/\[aria-invalid="true"\] \{ border-color: var\(--budget-field-border-error\) !important;/);
    expect(component).toContain("['estimated', 'Budgeted Cost']");
    expect(component).toContain('<th>Business Name</th>');
  });

  it('defines intrinsic A4 landscape pages, repeated table headers, unsplit rows and minimum 8pt text', () => {
    expect(printCss).toMatch(/\.page \{[^}]*width: 297mm;[^}]*height: 210mm/);
    expect(printCss).toContain('@page event-budget { size: A4 landscape; margin: 0; }');
    expect(printCss).toMatch(/\.table \{[^}]*font-size: 8pt/);
    expect(printCss).toMatch(/\.table tbody tr \{[^}]*break-inside: avoid;[^}]*page-break-inside: avoid/);
    expect(component).toContain('EventBudgetPrintDocument ref={printRootRef}');
  });
});
