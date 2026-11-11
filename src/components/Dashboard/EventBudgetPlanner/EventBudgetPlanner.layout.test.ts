import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const component = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/EventBudgetPlanner.tsx'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/EventBudgetPlanner.module.css'), 'utf8');
const printCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/EventBudgetPrintDocument.module.css'), 'utf8');
const dashboard = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.tsx'), 'utf8');
const drawer = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/EventBudgetPlanner/ExpenseDrawer.tsx'), 'utf8');

describe('Event Budget Planner layout contract', () => {
  it('is placed immediately after the event selector and only renders for the selected event', () => {
    expect(dashboard.indexOf('<EventBudgetPlanner key={selectedEvent.id} event={selectedEvent} exportTarget={exportTarget} />')).toBeGreaterThan(dashboard.indexOf('className={styles.eventPanel}'));
    expect(dashboard).toContain('{selectedEvent && <EventBudgetPlanner key={selectedEvent.id} event={selectedEvent} exportTarget={exportTarget} />}');
    expect(dashboard).not.toMatch(/Your Event at a Glance|Event Overview|Tables &amp; Seating|Needs Attention|Wedding Setup Progress/);
  });

  it('matches the Dashboard heading typography and provides six summary cards', () => {
    expect(css).toMatch(/\.plannerHeading h2 \{[^}]*font-size: 24px;[^}]*font-weight: 600;[^}]*line-height: 1\.25/);
    expect(component).toContain('<h2 id="event-budget-heading">Your Event Budget</h2>');
    expect(component).toContain('Plan your event spending, track payments and stay on budget.');
    expect(component).toContain("['Total Budget', summary.totalBudget");
    expect(component).toContain("['Amount Outstanding', summary.amountOutstanding");
    expect(component).toContain("summary.budgetRemaining < 0 ? 'Over Budget' : 'Budget Remaining'");
    expect(component.indexOf('className={styles.summaryGrid}')).toBeGreaterThan(component.indexOf('data-budget-panel'));
    expect(component).toContain('className={styles.summaryBudgetInput}');
    expect(component).not.toContain('className={styles.budgetControls}');
    expect(css).toMatch(/\.budgetPanel \{[^}]*min-height: 7rem;[^}]*grid-template-columns: minmax\(11rem,.7fr\) minmax\(25\.5rem,1\.3fr\) auto/);
    expect(css).toMatch(/\.budgetPanel \{[^}]*border: 0;[^}]*border-radius: 0;[^}]*outline: 0;[^}]*background: transparent;[^}]*box-shadow: none/);
    expect(css).toMatch(/\.expensePanel \{[^}]*border: 1px solid var\(--dashboard-border\);[^}]*background: var\(--dashboard-panel\)/);
    expect(css).toMatch(/\.summaryGrid \{[^}]*grid-template-columns: repeat\(3,minmax\(0,1fr\)\);[^}]*grid-template-rows: repeat\(2,minmax\(0,1fr\)\)/);
  });

  it('uses a parent section card, edits within Total Budget and keeps the toolbar Add action', () => {
    expect(css).toMatch(/\.planner \{[^}]*padding: 1rem;[^}]*border: 1px solid var\(--dashboard-border\);[^}]*background: var\(--dashboard-panel\)/);
    expect(component).toContain('className={`${styles.successButton} ${styles.exportAction}`} onClick={() => requestPrintAction(\'print\')}');
    expect(component).toContain('className={`${styles.successButton} ${styles.exportAction}`} onClick={() => requestPrintAction(\'download\')}');
    expect(css).toMatch(/\.summaryBudgetInput \{[^}]*display:grid;[^}]*grid-template-columns:auto minmax\(0,1fr\)/);
    expect(component).not.toContain('id="event-budget-currency"');
    expect(component).toContain('className={`${styles.borderlessBudgetInput} border-0`} id="anticipated-event-budget"');
    expect(component.indexOf('ref={addButtonRef}')).toBeGreaterThan(component.indexOf('Sort expenses'));
  });

  it('uses the dedicated money-bag icon for the budget save action', () => {
    expect(component).toContain('const MoneyBagIcon: React.FC<{ size?: number }>');
    expect(component).toContain('className={styles.moneyBagIcon}');
    expect(component).toContain('<MoneyBagIcon />{saveBudget.isPending');
    expect(component).not.toContain('<Save size={16} aria-hidden="true" />{saveBudget.isPending');
    expect(css).toMatch(/button\.exportAction svg\.moneyBagIcon \{ width:16px!important; height:16px!important; flex:0 0 16px; \}/);
  });

  it('keeps the editable Total Budget amount visually borderless with an accessible focus underline', () => {
    expect(component).toContain('className={`${styles.borderlessBudgetInput} border-0`} id="anticipated-event-budget"');
    expect(fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8')).toContain(':not([class*="border-0"])');
    expect(css).toMatch(/\.summaryBudgetInput > input \{[^}]*appearance:none;[^}]*border:0;[^}]*background:transparent;[^}]*box-shadow:none;[^}]*outline:none/);
    expect(css).toMatch(/:global\(#root#root#root\) \.planner \.summaryBudgetInput > input\.borderlessBudgetInput \{[^}]*border:0 !important;[^}]*border-style:none !important;[^}]*border-color:transparent !important;[^}]*box-shadow:none !important/);
    expect(css).toMatch(/input\.borderlessBudgetInput:focus-visible \{[^}]*border:0 !important;[^}]*outline:none !important;[^}]*box-shadow:inset 0 -2px 0 #55a447 !important/);
    expect(css).toMatch(/\.borderlessBudgetInput\[aria-invalid="true"\]:focus-visible \{[^}]*#dc2626 !important/);
  });

  it('uses one shared desktop table layout and scrolls safely at narrower widths', () => {
    expect(component).toContain('<colgroup><col className={styles.categoryColumn}/>');
    expect(component).toContain('<th className={styles.centeredColumn}>Notes</th>');
    expect(component).toContain("{expense.notes?.trim() ? 'Yes' : 'No'}");
    expect(css).toMatch(/\.tableRegion \{[^}]*width: 100%;[^}]*max-width: 100%;[^}]*overflow-x: auto;[^}]*-webkit-overflow-scrolling: touch/);
    expect(css).toMatch(/\.expenseTable \{[^}]*width: 100%;[^}]*min-width: 77rem;[^}]*table-layout: fixed/);
    expect(css).toMatch(/@media \(max-width: 70rem\)[\s\S]*\.tableRegion \{ display: block; \}[\s\S]*\.mobileExpenses \{ display: none; \}/);
    expect(css).toMatch(/\.planner \{[^}]*min-width: 0/);
  });

  it('uses shared column tracks, aligned values and alternating rows', () => {
    expect(css).toContain('.categoryColumn { width: 5.5rem; }');
    expect(css).toContain('.businessColumn { width: 7.5rem; }');
    expect(css).toContain('.contactColumn { width: 8.5rem; }');
    expect(css).toContain('.budgetedColumn { width: 6.5rem; }');
    expect(css).toContain('.actualColumn { width: 7rem; }');
    expect(css).toContain('.paidColumn { width: 7rem; }');
    expect(css).toContain('.notesColumn { width: 4rem; }');
    expect(css).toMatch(/\.expenseTable td \{[^}]*overflow-wrap: anywhere;[^}]*word-break: break-word/);
    expect(css).toMatch(/\.expenseTable \.money \{[^}]*white-space: nowrap/);
    expect(css).toMatch(/\.expenseTable th \{[^}]*color: #fff;[^}]*background: #472c1d;[^}]*font-size: 13px;[^}]*font-weight: 600;[^}]*line-height: 18px;[^}]*text-align: center;[^}]*vertical-align: middle/);
    expect(css).toContain('.textColumn,.textHeaderColumn { text-align: left; }');
    expect(css).toContain('.centeredColumn { text-align: center; vertical-align: middle !important; }');
    expect(css).toMatch(/\.expenseTable th \{[^}]*padding: \.8rem \.4rem/);
    expect(css).toMatch(/\.expenseTable td \{[^}]*padding: \.85rem \.4rem/);
    expect(css).toContain('.expenseTable tbody tr:nth-child(odd) td { background: #fbf8f2; }');
    expect(css).toContain('.expenseTable tbody tr:nth-child(even) td { background: #f5ebdd; }');
  });

  it('matches Guest List body typography for desktop and mobile expense values without changing status or edit controls', () => {
    expect(css).toMatch(/\.expenseTable tbody td:not\(:nth-child\(11\)\):not\(:nth-child\(12\)\)[\s\S]*font-size: 13px;[\s\S]*font-weight: 400;[\s\S]*line-height: 18px/);
    expect(css).toMatch(/\.mobileExpenseCard :is\([\s\S]*font-size: 13px;[\s\S]*font-weight: 400;[\s\S]*line-height: 18px/);
    expect(css).toMatch(/\.statusPill \{[^}]*font-size: 10px;[^}]*font-weight: 700;[^}]*line-height: 1/);
    expect(css).toContain('button.tableEditButton { font-size:14px !important; font-weight:600; }');
  });

  it('uses borderless solid semantic controls with white content and reduced-motion support', () => {
    expect(css).toMatch(/\.successButton \{[^}]*border: 0 !important;[^}]*color: #FFFFFF !important;[^}]*#4ade80[^}]*#22c55e[^}]*#16a34a/);
    expect(css).toMatch(/\.dangerButton \{[^}]*border: 0 !important;[^}]*color: #FFFFFF !important;[^}]*#f87171[^}]*#ef4444[^}]*#dc2626/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('uses the approved green treatment for Edit without changing the drawer action treatments', () => {
    expect(component).toContain('className={`${styles.successButton} ${styles.tableEditButton}`} aria-label={`Edit ${expenseTitle(expense)}`}');
    expect(css).toMatch(/\.tableEditButton \{[^}]*min-height: 30px;[^}]*white-space: nowrap/);
    expect(drawer).toContain('className={styles.dangerButton} onClick={requestClose}');
    expect(drawer).toContain('<X size={16} aria-hidden="true" />Cancel');
    expect(drawer).toContain("className={styles.successButton} disabled={saving || deleting}");
  });

  it('keeps only the approved user-facing budget terminology', () => {
    expect(component).toContain('Budgeted Costs');
    expect(component).toContain('<th className={styles.textHeaderColumn}>Business Name</th>');
    expect(component).toContain('<th className={styles.centeredColumn}>Budgeted Cost</th>');
    expect(component).not.toMatch(/Estimated Cost|Estimated Costs|Expense \/ Vendor/);
  });

  it('uses opaque champagne-gold drawer fields with stronger hover, espresso focus and red validation precedence', () => {
    expect(css).toContain('--budget-field-border: #cdb99e');
    expect(css).toContain('--budget-field-border-hover: #a18764');
    expect(css).toContain('--budget-field-border-focus: #2b1711');
    expect(css).toMatch(/\[aria-invalid="true"\] \{ border-color: var\(--budget-field-border-error\) !important;/);
    expect(component).toContain("['estimated', 'Budgeted Cost']");
    expect(component).toContain('<th className={styles.textHeaderColumn}>Business Name</th>');
  });

  it('defines intrinsic A4 landscape pages, repeated table headers, unsplit rows and minimum 8pt text', () => {
    expect(printCss).toMatch(/\.page \{[^}]*width: 297mm;[^}]*height: 210mm/);
    expect(printCss).toContain('@page event-budget { size: A4 landscape; margin: 0; }');
    expect(printCss).toMatch(/\.table \{[^}]*font-size: 8pt/);
    expect(printCss).toMatch(/\.table tbody tr \{[^}]*break-inside: avoid;[^}]*page-break-inside: avoid/);
    expect(component).toMatch(/EventBudgetPrintDocument ref=\{/);
  });
});
