import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('dashboard table contrast', () => {
  it('uses an opaque espresso header and footer for My Events', () => {
    const css = read('src/components/Dashboard/MyEventsPage.module.css');

    expect(css).toMatch(/\.ww-events-table-panel\) thead tr[\s\S]*background: #472c1d !important/);
    expect(css).toMatch(/\.ww-events-table-panel\) thead th[\s\S]*color: #ffffff !important/);
    expect(css).toMatch(/\.ww-events-footer\)[\s\S]*background: #472c1d !important/);
    expect(css).toMatch(/\.ww-events-footer\) :is\(td, span, button, svg\)[\s\S]*color: #ffffff !important/);
  });

  it('uses the same high-contrast treatment for Guest List and pagination', () => {
    const css = read('src/components/Dashboard/GuestListTable.module.css');

    expect(css).toMatch(/\.tableWrap thead tr,[\s\S]*background: #472c1d !important/);
    expect(css).toMatch(/\.tableWrap thead :is\(button, span, svg\)[\s\S]*color: #fff !important/);
    expect(css).toMatch(/\.tableWrap > div:last-child[\s\S]*background: #472c1d !important/);
    expect(css).toMatch(/\.pagination \{[\s\S]*background: #472c1d !important/);
    expect(css).toMatch(/\.pagination :is\(p, span, svg\)[\s\S]*color: #fff !important/);
  });

  it('retains dedicated desktop, tablet, and mobile table layouts', () => {
    const events = read('src/components/Dashboard/EventsTable.tsx');
    const guests = read('src/components/Dashboard/GuestListTable.tsx');

    expect(events).toContain('const isMobile = useIsMobile();');
    expect(events).toContain('max-lg:flex-wrap max-lg:justify-center');
    expect(guests).toContain('`${styles.mobileCards} lg:hidden');
    expect(guests).toContain('`${styles.tableWrap} hidden lg:block');
    expect(guests).toContain('max-lg:flex-col max-lg:items-center max-lg:gap-2');
  });

  it('uses the darkest Tables token for head and numbered table markers', () => {
    const card = read('src/components/Dashboard/TableCard.tsx');
    const css = read('src/pages/TablesPage.module.css');

    expect(card).toContain('ww-head-table-badge');
    expect(card).toContain('table.table_no != null');
    expect(card).toContain('relative mx-auto flex h-7 w-7 items-center justify-center');
    expect(card).toContain('ww-regular-table-number pointer-events-none absolute h-[34px] w-[34px] rounded-full border');
    expect(css).not.toContain(':global(.ww-table-name) > span');
    expect(css).toMatch(/\.ww-head-table-badge\),[\s\S]*\.ww-regular-table-number\)[\s\S]*color: var\(--tables-text\) !important;[\s\S]*border-color: var\(--tables-text\) !important;[\s\S]*background: transparent !important/);
    expect(css).toMatch(/\.ww-head-table-badge\) svg[\s\S]*color: currentColor !important;[\s\S]*stroke: currentColor !important/);
  });
});
