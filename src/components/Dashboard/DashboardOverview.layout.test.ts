import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const componentSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.module.css'), 'utf8');

describe('Event Budget Planner page layout contract', () => {
  it('uses a full-width, overflow-safe page and compact event selector', () => {
    expect(componentSource).toContain('w-full max-w-none');
    expect(cssSource).toMatch(/\.overview \{[^}]*width: 100%;[^}]*min-width: 0;/);
    expect(cssSource).toMatch(/\.eventField \{[^}]*width: clamp\(16rem, 24vw, 24rem\);[^}]*max-width: 100%;/);
  });

  it('keeps the heading and selector together in the compact event card', () => {
    expect(componentSource).toContain('<Card className={styles.eventPanel}>');
    expect(componentSource.indexOf('<Card className={styles.eventPanel}>')).toBeLessThan(componentSource.indexOf('<header className={styles.pageHeader}>'));
    expect(componentSource.indexOf('<header className={styles.pageHeader}>')).toBeLessThan(componentSource.indexOf('className={styles.eventSelectorRow}'));
    expect(componentSource).toContain('<h1 className={styles.heading}>Event Budget Planner</h1>');
    expect(componentSource).toContain('{selectedEvent && <EventBudgetPlanner key={selectedEvent.id} event={selectedEvent} exportTarget={exportTarget} />}');
    expect(componentSource.indexOf('className={styles.eventPanel}')).toBeLessThan(componentSource.indexOf('<EventBudgetPlanner key={selectedEvent.id} event={selectedEvent} exportTarget={exportTarget} />'));
    expect(componentSource).not.toMatch(/workflowBadge|Continue to Tables|Your Event at a Glance|overviewPanel|cardGrid/);
    expect(cssSource).toMatch(/\.eventPanel \{[^}]*padding: \.85rem 1rem 1rem;[^}]*border: 1px solid var\(--dashboard-border\) !important;[^}]*background: var\(--dashboard-panel\) !important;/);
  });

  it('uses the approved responsive compact padding and light palette', () => {
    expect(cssSource).toMatch(/\.mainSurface \{[^}]*--dashboard-workspace: #f2e9dc/);
    expect(cssSource).toMatch(/\.mainSurface \{[^}]*background-color: var\(--dashboard-workspace\) !important/);
    expect(cssSource).toMatch(/@media \(max-width: 767px\)[\s\S]*\.eventPanel \{ padding: \.75rem; \}/);
    expect(cssSource).toMatch(/@media \(max-width: 767px\)[\s\S]*\.eventSelectorRow \{[^}]*flex-direction: column;[^}]*align-items: stretch;/);
    expect(cssSource).toMatch(/@media \(max-width: 767px\)[\s\S]*\.eventField \{ width: 100%; \}/);
  });

  it('keeps the 24px page heading and 13px event-selector hierarchy', () => {
    expect(cssSource).toMatch(/\.heading \{[^}]*font-size: 24px;[^}]*font-weight: 600;/);
    expect(cssSource).toMatch(/\.eventLabel \{[^}]*font-size: 13px;[^}]*font-weight: 600;[^}]*line-height: 18px;/);
    expect(cssSource).toMatch(/\.eventMenu \[role="option"\] \{[^}]*font-size: 13px !important;/);
  });
});
