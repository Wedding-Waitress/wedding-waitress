import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/DashboardOverview.module.css'), 'utf8');

describe('Event Budget Planner page typography', () => {
  it('uses the approved page-heading hierarchy', () => {
    expect(css).toMatch(/\.heading \{[^}]*font-size: 24px;[^}]*font-weight: 600;/);
    expect([...css.matchAll(/\.heading\s*\{[^}]*?font-size:\s*([^;]+);/g)].map(match => match[1].replace(/\s*!important$/, ''))).toEqual(['24px', '24px']);
  });

  it('uses compact 13px event-selector text', () => {
    expect(css).toMatch(/\.eventLabel \{[^}]*font-size: 13px;[^}]*font-weight: 600;[^}]*line-height: 18px;/);
    expect(css).toMatch(/\.eventField \{[^}]*font-size: 13px !important;[^}]*font-weight: 400 !important;[^}]*line-height: 18px !important;/);
  });
});
