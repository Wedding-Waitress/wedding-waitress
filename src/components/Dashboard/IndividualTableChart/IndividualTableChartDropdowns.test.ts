import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('Individual Table Charts header dropdown contract', () => {
  it('isolates the opaque styling to the event and table selectors', () => {
    const page = read('src/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage.tsx');

    expect(page.match(/styles\.headerSelectTrigger/g)).toHaveLength(2);
    expect(page.match(/<SelectContent className=\{styles\.headerSelectMenu\}>/g)).toHaveLength(2);
    expect(page).toContain('className={styles.headerSelectOption} key={event.id}');
    expect(page).toContain('className={styles.headerSelectOption} key={table.id}');
  });

  it('keeps both the closed fields and portal menus fully opaque white', () => {
    const css = read('src/components/Dashboard/IndividualTableChart/IndividualTableChartPage.module.css');

    expect(css).toMatch(/\.headerSelectTrigger,[\s\S]*?background:\s*#ffffff\s*!important;[\s\S]*?background-image:\s*none\s*!important;/);
    expect(css).toMatch(/\.headerSelectMenu\s*\{[\s\S]*?background:\s*#ffffff\s*!important;[\s\S]*?background-image:\s*none\s*!important;[\s\S]*?opacity:\s*1\s*!important;/);
    expect(css).toMatch(/\.headerSelectOption:is\(:hover,\s*:focus,\s*\[data-highlighted\]\)[\s\S]*?background:\s*#eadbc8\s*!important;/);
    expect(css).toMatch(/\.headerSelectOption\[data-state="checked"\][\s\S]*?background:\s*#e5d3bd\s*!important;/);
  });

  it('does not apply dashboard dropdown styling to the A4 renderer', () => {
    const printPage = read('src/components/Dashboard/IndividualTableChart/IndividualTableChartPrintPage.tsx');

    expect(printPage).not.toContain('headerSelectTrigger');
    expect(printPage).not.toContain('headerSelectMenu');
    expect(printPage).not.toContain('headerSelectOption');
  });
});
