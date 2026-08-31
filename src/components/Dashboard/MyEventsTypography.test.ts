import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('My Events typography', () => {
  const pageCss = read('src/components/Dashboard/MyEventsPage.module.css');
  const modalCss = read('src/components/Dashboard/EventCreateModal.module.css');
  const eventsTable = read('src/components/Dashboard/EventsTable.tsx');

  it('keeps the page and selected-event headings at 24px and 600 at every width', () => {
    expect(pageCss).toMatch(/\.countdownMessage \{[\s\S]*?font-size: 24px !important;[\s\S]*?font-weight: 600 !important;/);
    expect(pageCss).toMatch(/\.eventTitle,[\s\S]*?\.ww-events-title[\s\S]*?font-size: 24px !important;[\s\S]*?font-weight: 600 !important;/);
    expect(pageCss).not.toMatch(/@media[\s\S]*?\.eventTitle[\s\S]*?font-size:/);
  });

  it('uses the approved card, form, label, body, table, button, and badge hierarchy', () => {
    expect(pageCss).toMatch(/\.detailHeading \{[\s\S]*?font-size: 20px !important;[\s\S]*?font-weight: 500 !important;/);
    expect(pageCss).toMatch(/\.countdownLabel \{[\s\S]*?font-size: 13px !important;[\s\S]*?font-weight: 600 !important;[\s\S]*?line-height: 18px !important;/);
    expect(pageCss).toMatch(/\.ww-events-row[\s\S]*?td \{[\s\S]*?font-size: 13px !important;[\s\S]*?font-weight: 400 !important;[\s\S]*?line-height: 18px !important;/);
    expect(pageCss).toMatch(/\.dialogButton \{[\s\S]*?font-size: 13px !important;[\s\S]*?font-weight: 500 !important;/);
    expect(modalCss).toMatch(/\.title \{[\s\S]*?font-size: 20px !important;[\s\S]*?font-weight: 500 !important;/);
    expect(modalCss).toMatch(/\.drawer label \{[\s\S]*?font-size: 13px !important;[\s\S]*?font-weight: 600 !important;[\s\S]*?line-height: 18px !important;/);
    expect(eventsTable).toContain('ww-events-button');
    expect(eventsTable).toContain('ww-events-badge');
  });

  it('does not resize the countdown numerals or target shared global typography', () => {
    expect(pageCss).not.toMatch(/\.countdownNumber \{[^}]*font-size:/);
    expect(pageCss).not.toMatch(/(^|\n)\s*(body|html|:root)\s*\{[\s\S]*?font-size:/);
  });
});
