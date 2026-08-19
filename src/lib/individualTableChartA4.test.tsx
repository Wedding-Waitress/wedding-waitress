import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IndividualTableChartPrintPage } from '@/components/Dashboard/IndividualTableChart/IndividualTableChartPrintPage';
import { IndividualTableChartCustomizer } from '@/components/Dashboard/IndividualTableChart/IndividualTableChartCustomizer';
import {
  GUEST_TEXT_SIZE_PT,
  DIAGRAM_SAFE_GAP_MM,
  FOOTER_CLEARANCE_MM,
  PREVIOUS_RADIAL_TABLE_SIZE_PX,
  RADIAL_CANVAS_WIDTH_PX,
  RADIAL_DIAGRAM_HEIGHT_PX,
  RADIAL_TABLE_CENTER_X_PX,
  RADIAL_TABLE_SIZE_PX,
  getSquarePosition,
  getSquareSideCounts,
} from '@/components/Dashboard/IndividualTableChart/IndividualTableChartPrintPage';
import { toggleAccentColor } from '@/components/Dashboard/IndividualTableChart/IndividualTableChartCustomizer';
import type { IndividualChartSettings } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { A4_ASPECT_RATIO, A4_MM, A4_PAGE_STYLE } from './a4';

const settings: IndividualChartSettings = {
  tableShape: 'round',
  fontSize: 'medium',
  includeNames: true,
  includeDietary: true,
  includeRelation: true,
  includeGuestList: true,
  showSeatNumbers: true,
  isBold: false,
  isItalic: false,
  isUnderline: false,
  largerTableNames: false,
  guestTextSize: 'standard',
  guestNameColor: '#000000',
  seatNumberColor: '#000000',
  guestListColor: '#000000',
  dietaryColor: '#000000',
  relationshipColor: '#000000',
  paperSize: 'A4',
  title: 'TABLE 1',
  showLogo: true,
  enableEndSeats: false,
  endSeatsCount: 1,
};

const table = { id: 'table-1', name: 'Table 1', table_no: 1 } as any;
const guest = {
  id: 'guest-1',
  table_id: 'table-1',
  seat_no: 1,
  first_name: 'Ada',
  last_name: 'Lovelace',
  dietary: 'Vegan',
  relation_display: 'Friend',
} as any;
const tenGuests = Array.from({ length: 10 }, (_, index) => ({
  ...guest,
  id: `guest-${index + 1}`,
  seat_no: index + 1,
  first_name: `Guest${index + 1}`,
}));

describe('individual table chart A4 architecture', () => {
  const renderPage = (overrides: Partial<IndividualChartSettings> = {}, page = 6, total = 10) => renderToStaticMarkup(
    <IndividualTableChartPrintPage
      settings={{ ...settings, ...overrides }}
      table={table}
      guests={[guest]}
      event={{ name: 'Test Wedding', date: '2026-08-11' }}
      currentTableIndex={page}
      totalTables={total}
    />
  );

  it('defines one exact portrait A4 coordinate system and aspect ratio', () => {
    expect(A4_MM).toEqual({ width: 210, height: 297 });
    expect(A4_PAGE_STYLE).toEqual({ width: '210mm', height: '297mm' });
    expect(A4_ASPECT_RATIO).toBeCloseTo(210 / 297, 10);
  });

  it('renders table data and display options through the canonical A4 page', () => {
    const markup = renderPage();

    expect(markup).toContain('width:210mm');
    expect(markup).toContain('height:297mm');
    expect(markup).toContain('data-individual-table-chart-page="true"');
    expect(markup).toContain('Ada');
    expect(markup).toContain('Vegan');
    expect(markup).toContain('Friend');

    const toggledMarkup = renderPage({ includeNames: false, includeDietary: false, includeRelation: false, includeGuestList: false });
    expect(toggledMarkup).not.toContain('Ada');
    expect(toggledMarkup).not.toContain('Vegan');
    expect(toggledMarkup).not.toContain('Friend');
  });

  it.each(['round', 'square', 'long'] as const)('renders the canonical %s table layout', (tableShape) => {
    expect(renderPage({ tableShape })).toContain(`data-table-layout="${tableShape}"`);
  });

  it.each(['small', 'standard', 'large'] as const)('keeps round and square diagrams inside explicit safe regions at %s size', (guestTextSize) => {
    for (const tableShape of ['round', 'square'] as const) {
      const markup = renderToStaticMarkup(
        <IndividualTableChartPrintPage settings={{ ...settings, tableShape, guestTextSize }} table={table} guests={tenGuests} event={{ name: 'Test Wedding', date: '2026-08-11' }} />
      );
      expect(markup).toContain('data-diagram-safe-region="true"');
      expect(markup).toContain(`data-diagram-height="${RADIAL_DIAGRAM_HEIGHT_PX[guestTextSize]}"`);
      expect(markup).toContain(`padding:${DIAGRAM_SAFE_GAP_MM}mm 0`);
      expect(markup).toContain('overflow:hidden');
    }
  });

  it('uses deterministic shared-height guest-list rows for pairs 1/2 through 9/10', () => {
    const markup = renderToStaticMarkup(
      <IndividualTableChartPrintPage settings={{ ...settings, guestTextSize: 'large' }} table={table} guests={tenGuests} event={{ name: 'Test Wedding', date: '2026-08-11' }} />
    );
    expect(markup).toContain('data-layout="paired-rows"');
    for (const pair of ['1-2', '3-4', '5-6', '7-8', '9-10']) expect(markup).toContain(`data-guest-pair="${pair}"`);
    expect(markup.match(/grid-template-columns:1fr 1fr/g)).toHaveLength(5);
    expect(markup.match(/align-items:start/g)).toHaveLength(5);
  });

  it('reduces the round and square table footprint by exactly 25 percent', () => {
    expect(RADIAL_TABLE_SIZE_PX).toBe(210);
    expect(RADIAL_TABLE_SIZE_PX / PREVIOUS_RADIAL_TABLE_SIZE_PX).toBe(0.75);
  });

  it('centres radial table geometry independently of label lengths', () => {
    expect(RADIAL_TABLE_CENTER_X_PX).toBe(RADIAL_CANVAS_WIDTH_PX / 2);
    for (const tableShape of ['round', 'square'] as const) {
      const markup = renderPage({ tableShape, guestTextSize: 'large' });
      expect(markup).toContain(`data-table-center-x="${RADIAL_TABLE_CENTER_X_PX}"`);
      expect(markup).toContain(`left:${RADIAL_TABLE_CENTER_X_PX}px`);
      expect(markup).toContain(`min-width:${RADIAL_CANVAS_WIDTH_PX}px`);
      expect(markup).toContain('flex:0 0 auto');
    }
  });

  it('places square top and bottom pairs at one-third and two-thirds of the table width', () => {
    const centerY = 245;
    const topLeft = getSquarePosition(0, 10, centerY);
    const topRight = getSquarePosition(1, 10, centerY);
    const bottomRight = getSquarePosition(5, 10, centerY);
    const bottomLeft = getSquarePosition(6, 10, centerY);
    expect([topLeft.seatX, topRight.seatX]).toEqual([295, 365]);
    expect([bottomLeft.seatX, bottomRight.seatX]).toEqual([295, 365]);
  });

  it.each([
    ['small', 8],
    ['standard', 10],
    ['large', 12],
  ] as const)('maps %s guest text to %s pt with an 8 pt minimum', (guestTextSize, points) => {
    expect(GUEST_TEXT_SIZE_PT[guestTextSize]).toBe(points);
    expect(renderPage({ guestTextSize })).toContain(`font-size:${points}pt`);
    expect(points).toBeGreaterThanOrEqual(8);
  });

  it('keeps text styles, black defaults, wrapping, and the fixed three-column footer', () => {
    const markup = renderPage({ isBold: true, isItalic: true, isUnderline: true });
    expect(markup).toContain('font-weight:700');
    expect(markup).toContain('font-style:italic');
    expect(markup).toContain('text-decoration:underline');
    expect(markup).toContain('src="/wedding-waitress-logo-brown.png"');
    expect(markup).not.toContain('filter:grayscale');
    expect(markup).toContain('data-footer-layout="three-column"');
    expect(markup).toContain('data-footer-alignment="single-line-centred"');
    expect(markup).toContain('grid-template-columns:1fr auto 1fr');
    expect(markup).toContain('Page 6 of 10');
    expect(markup).toContain(`padding-bottom:${FOOTER_CLEARANCE_MM}mm`);
    expect(markup).toContain('align-items:center');
    expect(markup).toContain('data-footer-generated="true" style="justify-self:start;align-self:center;white-space:nowrap;font-size:8pt"');
    expect(markup).toContain('data-footer-page-number="true" style="justify-self:end;align-self:center;white-space:nowrap;font-size:8pt"');
    expect(markup).not.toContain('#967A59');
    expect(markup).not.toContain('text-overflow');
    expect(markup).not.toContain('ellipsis');
    expect(markup).not.toContain('white-space:nowrap" data-guest-label');
  });

  it.each([
    [10, [2, 3, 2, 3]],
    [11, [3, 3, 2, 3]],
    [12, [3, 3, 3, 3]],
    [13, [3, 4, 3, 3]],
    [20, [5, 5, 5, 5]],
  ] as const)('balances %s square guests across all four sides', (count, expected) => {
    const counts = getSquareSideCounts(count);
    expect(counts).toEqual(expected);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.reduce((sum, sideCount) => sum + sideCount, 0)).toBe(count);
  });

  it('keeps square seats clockwise and inset while labels follow their seats', () => {
    const centerY = 225;
    const positions = Array.from({ length: 12 }, (_, index) => getSquarePosition(index, 12, centerY));
    const top = positions.slice(0, 3);
    const right = positions.slice(3, 6);
    const bottom = positions.slice(6, 9);
    const left = positions.slice(9, 12);

    expect(top.map(({ seatX }) => seatX)).toEqual([277.5, 330, 382.5]);
    expect(right.map(({ seatY }) => seatY)).toEqual([140, 225, 310]);
    expect(bottom.map(({ seatX }) => seatX)).toEqual([382.5, 330, 277.5]);
    expect(left.map(({ seatY }) => seatY)).toEqual([310, 225, 140]);
    expect(left.map(({ labelY }) => labelY)).toEqual([310, 225, 140]);
  });

  it('applies all five accent colours independently with black defaults', () => {
    const accented = renderPage({ guestNameColor: '#7E57C2', seatNumberColor: '#E67E22', guestListColor: '#967A59', dietaryColor: '#C62828', relationshipColor: '#1565C0' });
    expect(accented).toContain('data-guest-name-text="true" style="color:#7E57C2"');
    expect(accented).toContain('data-seat="true" style="width:30px;height:30px;border:1px solid #000;border-radius:50%;background:#fff;color:#E67E22');
    expect(accented).toContain('data-guest-list-text="true"');
    expect(accented).toContain('color:#967A59');
    expect(accented).toContain('data-dietary-text="true" style="color:#C62828"');
    expect(accented).toContain('data-relationship-text="true" style="color:#1565C0"');
    const defaults = renderPage();
    expect(defaults).toContain('data-dietary-text="true" style="color:#000000"');
    expect(defaults).toContain('data-relationship-text="true" style="color:#000000"');
    expect(toggleAccentColor(null, '#2E7D32')).toBe('#2E7D32');
    expect(toggleAccentColor('#2E7D32', '#2E7D32')).toBe('#2E7D32');
    expect(toggleAccentColor('#C62828', '#000000')).toBe('#000000');
    expect(toggleAccentColor('#1565C0', '#000000')).toBe('#000000');
    expect(toggleAccentColor('#2E7D32', '#000000')).toBe('#000000');
    expect(renderPage({ dietaryColor: '#000000', relationshipColor: '#000000' })).toContain('data-dietary-text="true" style="color:#000000"');
  });

  it('renders seven colour circles in the required order for all five Display Option rows', () => {
    const markup = renderToStaticMarkup(<IndividualTableChartCustomizer settings={settings} onSettingsChange={() => undefined} />);
    const labels = ['black', 'red', 'blue', 'green', 'Wedding Waitress gold', 'purple', 'orange'];
    const rows = ['guest names', 'seat numbers', 'guest list', 'dietary requirements', 'relationships'];
    for (const row of rows) {
      const positions = labels.map(label => markup.indexOf(`aria-label="Use ${label} for ${row}"`));
      expect(positions.every(position => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
    expect(markup.match(/h-4 w-4 rounded-full/g)).toHaveLength(35);
  });

  it.each([
    ['guestNameColor', 'data-guest-name-text="true" style="color:', '#7E57C2', '#E67E22'],
    ['seatNumberColor', 'data-seat="true" style="width:30px;height:30px;border:1px solid #000;border-radius:50%;background:#fff;color:', '#7E57C2', '#E67E22'],
    ['guestListColor', 'data-guest-list="true" data-layout="paired-rows" style="display:flex;flex-direction:column;gap:4px;color:', '#7E57C2', '#E67E22'],
    ['dietaryColor', 'data-dietary-text="true" style="color:', '#7E57C2', '#E67E22'],
    ['relationshipColor', 'data-relationship-text="true" style="color:', '#7E57C2', '#E67E22'],
  ] as const)('renders purple and orange independently for %s', (settingName, marker, purple, orange) => {
    expect(renderPage({ [settingName]: purple })).toContain(`${marker}${purple}`);
    expect(renderPage({ [settingName]: orange })).toContain(`${marker}${orange}`);
  });

  it('omits the outer A4 border while preserving internal separator, table and seat lines', () => {
    const markup = renderPage();
    const rootTag = markup.match(/^<div[^>]+>/)?.[0] || '';
    expect(rootTag).not.toContain('border:');
    expect(markup).toContain('data-header-separator="true" style="border-top:1px solid #000');
    expect(markup).toContain('data-table-layout="round"');
    expect(markup).toContain('border:1px solid #000');
    expect(markup).toContain('data-seat="true"');
  });

  it('returns to normal text when every independent text style is unchecked', () => {
    const markup = renderPage({ isBold: false, isItalic: false, isUnderline: false });
    expect(markup).toContain('font-weight:400');
    expect(markup).toContain('font-style:normal');
    expect(markup).toContain('text-decoration:none');
  });

  it('uses the same page component for preview, single export, and every all-pages export iteration', () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), 'src/components/Dashboard/IndividualTableChart/IndividualTableChartPreview.tsx'),
      'utf8'
    );
    const engineSource = readFileSync(resolve(process.cwd(), 'src/lib/individualTableChartEngine.ts'), 'utf8');
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage.tsx'),
      'utf8'
    );
    const customizerSource = readFileSync(
      resolve(process.cwd(), 'src/components/Dashboard/IndividualTableChart/IndividualTableChartCustomizer.tsx'),
      'utf8'
    );
    const dietarySource = readFileSync(
      resolve(process.cwd(), 'src/components/Dashboard/QRCode/KitchenDietaryChart.tsx'),
      'utf8'
    );
    const globalStyles = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const interfaceStyles = readFileSync(
      resolve(process.cwd(), 'src/components/Dashboard/IndividualTableChart/IndividualTableChartPage.module.css'),
      'utf8'
    );
    expect(previewSource).toContain('<IndividualTableChartPrintPage');
    expect(engineSource).toContain('React.createElement(IndividualTableChartPrintPage');
    expect(engineSource).toContain('renderPrintPageToCanvas(settings, table, guests, event, 1, 1)');
    expect(engineSource).toContain('renderPrintPageToCanvas(settings, table, guests, event, currentTableIndex, totalTables)');
    expect(engineSource).toContain('renderPrintPageToCanvas(tableSettings, table, tableGuests, event, i + 1, tables.length)');
    expect(engineSource).toContain('format: [A4_MM.width, A4_MM.height]');
    expect(engineSource).toContain('if (i > 0)');
    expect(engineSource).toContain('pdf.addPage()');
    expect(pageSource).toContain('tables.findIndex((table) => table.id === selectedTableId) + 1');
    expect(pageSource).toContain('tables.length');
    expect(pageSource).toContain('normalizeDietaryAccentColor(parsed.guestNameColor)');
    expect(pageSource).toContain('normalizeDietaryAccentColor(parsed.seatNumberColor)');
    expect(pageSource).toContain('normalizeDietaryAccentColor(parsed.guestListColor)');
    expect(previewSource).toContain('Math.min(1, availableWidth / A4_PX.width)');
    expect(previewSource).toContain('transform: `scale(${tabletScale})`');
    expect(previewSource).toContain('<IndividualTableChartPrintPage');
    expect(previewSource).not.toContain("height: '325mm'");
    expect(customizerSource).not.toContain('<span>Normal</span>');
    expect(customizerSource).not.toContain('<span>None</span>');
    expect(customizerSource.match(/<ColorSwatches/g)).toHaveLength(5);
    expect(customizerSource).toContain('DIETARY_ACCENT_COLORS.map');
    expect(customizerSource).toContain('aria-pressed={isSelected}');
    expect(customizerSource).toContain('title={`Use ${label} for ${name}`}');
    expect(customizerSource.indexOf('<h3 className="font-semibold text-sm">End Seats</h3>')).toBeLessThan(customizerSource.indexOf('{/* Display Options */}'));
    expect(customizerSource.indexOf('<h3 className="font-semibold text-sm">Long Table Info</h3>')).toBeLessThan(customizerSource.indexOf('{/* Display Options */}'));
    expect(dietarySource).toMatch(/mode: 'single'[\s\S]*?getPageElement: \(\) => a4PreviewRef\.current/);
    expect(dietarySource).toMatch(/mode: 'all'[\s\S]*?getPageElement: \(\) => a4PreviewRef\.current/);
    expect(pageSource).toContain('aria-label="Download single page PDF"');
    expect(pageSource).toContain('aria-label="Download all pages PDF"');
    expect(pageSource).toContain('data-individual-chart-top-layout="true"');
    expect(pageSource).toContain('grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]');
    expect(pageSource).toContain('data-individual-chart-existing-controls="true"');
    expect(pageSource).toContain('data-export-controls-card="true"');
    expect(pageSource).toContain('styles.exportPanel');
    expect(pageSource).not.toContain('bg-white border border-[#472c1d] rounded-xl');
    expect(pageSource).toContain('flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch');
    expect(pageSource.indexOf('data-individual-chart-existing-controls="true"')).toBeLessThan(pageSource.indexOf('data-export-controls-card="true"'));
    expect(pageSource).toContain('onClick={handleDownloadPdf}');
    expect(pageSource).toContain('onClick={handleDownloadAllPdf}');
    expect(pageSource).toContain('disabled={isExporting || isExportingAll}');
    expect(pageSource).toMatch(/isExportingAll\s*\?\s*<LoaderCircle/);
    expect(pageSource.match(/ww-itc-export-button/g)).toHaveLength(2);
    expect(pageSource.match(/styles\.exportButton/g)).toHaveLength(2);
    expect(pageSource.match(/focus-visible:ring-green-500/g)).toHaveLength(2);
    expect(pageSource.match(/text-green-600" strokeWidth/g)).toHaveLength(4);
    expect(globalStyles).toContain('[class*="border-green"]:not(.ww-itc-export-button)');
    expect(globalStyles).toContain('[class*="text-green"]:not(.ww-itc-export-button)');
    expect(interfaceStyles).toContain(':not([data-individual-table-chart-page] *)');
    expect(interfaceStyles).toContain('.portalSurface');
    expect(interfaceStyles).toContain('border-color: #22c55e !important');
  });
});
