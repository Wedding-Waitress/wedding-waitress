import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.module.css'), 'utf8');

describe('Dashboard overview typography', () => {
  it('uses breakpoint-invariant 24px major headings', () => {
    expect(css).toMatch(/\.heading \{[^}]*font-size: 24px;[^}]*font-weight: 600;/);
    expect(css).toMatch(/\.introduction h2 \{[^}]*font-size: 24px;[^}]*font-weight: 600;/);
    expect(css).not.toMatch(/@media[^]*?\.(?:heading|introduction h2) \{[^}]*font-size:/);
  });

  it('uses the approved card and selected-event heading hierarchy', () => {
    expect(css).toMatch(/\.overviewCard \.cardHeading h2 \{[^}]*font-size: 16px;[^}]*font-weight: 600;/);
    expect(css).toMatch(/\.eventName \{[^}]*font-size: 18px;[^}]*font-weight: 600;/);
    expect(css).toMatch(/\.emptyState h2 \{[^}]*font-size: 20px;[^}]*font-weight: 500;/);
  });

  it('uses 13px interface text while preserving primary metric prominence', () => {
    expect(css).toMatch(/\.eventLabel \{[^}]*font-size: 13px;[^}]*font-weight: 600;[^}]*line-height: 18px;/);
    expect(css).toMatch(/\.eventMenu \[role="option"\] \{[^}]*font-size: 13px !important;[^}]*font-weight: 400 !important;[^}]*line-height: 18px !important;/);
    expect(css).toMatch(/\.cardHeading p \{[^}]*font-size: 12px;[^}]*font-weight: 400;[^}]*line-height: 17px;/);
    expect(css).toMatch(/\.metricList dd \{[^}]*font-size: 18px;[^}]*font-weight: 600;/);
    expect(css).toMatch(/\.cardAction \{[^}]*font-size: 12px;[^}]*font-weight: 500;[^}]*line-height: 17px;/);
    expect(css).toMatch(/\.primaryMetric strong \{[^}]*font-size: 24px;[^}]*font-weight: 600;/);
  });
});
