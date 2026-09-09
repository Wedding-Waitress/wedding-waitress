import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8');
const tableCard = readFileSync('src/components/Dashboard/TableCard.tsx', 'utf8');

describe('table card compact intrinsic layout', () => {
  it('starts cards at their intrinsic height instead of stretching each grid row', () => {
    expect(dashboard).toContain('grid grid-cols-1 items-start sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4');
  });

  it('halves the vertical card inset and keeps matching top and bottom padding', () => {
    expect(tableCard).toContain('className="px-4 py-2 flex flex-col min-h-fit"');
    expect(tableCard).not.toContain('className="p-4 flex flex-col min-h-fit"');
    const css = readFileSync('src/pages/TablesPage.module.css', 'utf8');
    expect(css).toMatch(/ww-table-card\) \{[\s\S]*padding: 12px 0 !important;/);
  });

  it('keeps the complete head-table seating action on one line without a crown', () => {
    const action = tableCard.match(/\{isHeadTable && <Button[^\n]+Arrange Head Table Seating<\/Button>\}/)?.[0] ?? '';
    expect(action).toContain('whitespace-nowrap');
    expect(action).toContain('w-full');
    expect(action).toContain('Arrange Head Table Seating');
    expect(action).not.toContain('<Crown');
  });
});
