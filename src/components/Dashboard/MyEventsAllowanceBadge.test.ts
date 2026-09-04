import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('My Events allowance badge', () => {
  const page = read('src/components/Dashboard/MyEventsPage.tsx');
  const table = read('src/components/Dashboard/EventsTable.tsx');

  it('removes the separate page-level usage pill', () => {
    expect(page).not.toContain("import { EventUsagePill }");
    expect(page).not.toContain('<EventUsagePill');
  });

  it('keeps the consolidated badge beside the event actions and allows compact wrapping', () => {
    const badgeIndex = table.indexOf('eventAllowanceLabel');
    const createIndex = table.indexOf('{isMobile ? "Create" : "Create Event"}');
    const guidedIndex = table.indexOf("{isMobile ? 'Guided' : 'Guided Setup'}");

    expect(badgeIndex).toBeGreaterThan(-1);
    expect(createIndex).toBeGreaterThan(badgeIndex);
    expect(guidedIndex).toBeGreaterThan(createIndex);
    expect(table).toContain('max-lg:flex-wrap max-lg:justify-center');
    expect(table).toContain('max-w-full whitespace-normal text-center');
  });
});
