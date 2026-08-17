import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTENT_HEIGHT_MM,
  CONTENT_START_MM,
  FULL_SEATING_CHART_ROW_HEIGHTS_MM,
  getFullSeatingChartGuestsPerColumn,
  getFullSeatingChartGuestsPerPage,
  paginateGuests,
} from './fullSeatingChartLayout';
import { A4_ASPECT_RATIO, A4_MM, A4_PAGE_STYLE, A4_PX } from './a4';

const root = process.cwd();
const preview = fs.readFileSync(path.join(root, 'src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx'), 'utf8');
const exporter = fs.readFileSync(path.join(root, 'src/lib/fullSeatingChartPdfExporter.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx'), 'utf8');

describe('Full Seating Chart A4 row and footer parity', () => {
  it('uses the canonical A4 portrait canvas and the approved proportional preview scaler', () => {
    expect(A4_MM).toEqual({ width: 210, height: 297 });
    expect(A4_PAGE_STYLE).toEqual({ width: '210mm', height: '297mm' });
    expect(A4_ASPECT_RATIO).toBeCloseTo(210 / 297, 12);
    expect(A4_PX).toEqual({ width: 794, height: 1123 });
    expect(preview).toContain('...A4_PAGE_STYLE');
    expect(preview).toContain('minWidth: A4_PAGE_STYLE.width');
    expect(preview).toContain('maxWidth: A4_PAGE_STYLE.width');
    expect(preview).toContain('minHeight: A4_PAGE_STYLE.height');
    expect(preview).toContain('availableWidth / A4_PX.width');
    expect(preview).toContain('height: `${A4_PX.height * previewScale}px`');
    expect(preview).toContain('transform: `scale(${previewScale})`');
    expect(preview).toContain("transformOrigin: 'top center'");
    expect(preview).not.toContain("height: '325mm'");
  });

  it('keeps preview and PDF on the same 210mm by 297mm portrait geometry', () => {
    expect(exporter).toContain("orientation: 'portrait'");
    expect(exporter).toContain("unit: 'mm'");
    expect(exporter).toContain("format: 'a4'");
    expect(exporter).toContain('PAGE_WIDTH_MM');
    expect(exporter).toContain('PAGE_HEIGHT_MM');
  });
  it('uses one fixed 25-position grid for all three text sizes', () => {
    expect(FULL_SEATING_CHART_ROW_HEIGHTS_MM).toEqual({ small: 9, standard: 9, large: 9 });
    expect(getFullSeatingChartGuestsPerColumn('small')).toBe(25);
    expect(getFullSeatingChartGuestsPerColumn('standard')).toBe(25);
    expect(getFullSeatingChartGuestsPerColumn('large')).toBe(25);
    expect(getFullSeatingChartGuestsPerPage('small')).toBe(50);
    expect(getFullSeatingChartGuestsPerPage('standard')).toBe(50);
    expect(getFullSeatingChartGuestsPerPage('large')).toBe(50);
  });

  it.each(['small', 'standard', 'large'] as const)('paginates %s rows intact and balances columns', size => {
    const guests = Array.from({ length: 78 }, (_, index) => ({ id: index + 1 }));
    const pages = paginateGuests(guests, size);
    const perColumn = getFullSeatingChartGuestsPerColumn(size);
    expect(pages.flatMap(item => item.guests)).toEqual(guests);
    expect(pages.every(item => item.col1Count <= perColumn)).toBe(true);
    expect(pages.every(item => item.guests.length <= perColumn * 2)).toBe(true);
    expect(perColumn * FULL_SEATING_CHART_ROW_HEIGHTS_MM[size]).toBeLessThanOrEqual(CONTENT_HEIGHT_MM);
  });

  it.each(['small', 'standard', 'large'] as const)('keeps the same two-page ranges for 78 guests at %s size', size => {
    const guests = Array.from({ length: 78 }, (_, index) => index + 1);
    const pages = paginateGuests(guests, size);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({ guests: guests.slice(0, 50), col1Count: 25, startIndex: 0, endIndex: 50 });
    expect(pages[1]).toMatchObject({ guests: guests.slice(50), col1Count: 25, startIndex: 50, endIndex: 78 });
  });

  it('centres every row item with approved padding and one-pixel border', () => {
    expect(preview).toContain('height: `${rowHeightMm}mm`');
    expect(preview).toContain("paddingTop: '3.5pt'");
    expect(preview).toContain("paddingBottom: '3.5pt'");
    expect(preview).toContain('className="flex items-center');
    expect(preview).toContain('overflow-hidden box-border');
    expect(preview).toContain('flex-1 min-w-0 truncate');
    expect(preview).toContain('flex-shrink-0 whitespace-nowrap');
    expect(preview).toContain('align-items: center;');
    expect(preview).toContain('borderBottom: `1px solid');
    expect(exporter).toContain('const nameBaselineY = yPos + (rowHeight / 2)');
    expect(exporter).toContain('pdf.setLineWidth(FULL_SEATING_CHART_PDF_ROW_BORDER_WIDTH_MM)');
  });

  it('keeps a fixed 12mm exclusion between full rows and the approved footer', () => {
    expect(CONTENT_START_MM + CONTENT_HEIGHT_MM).toBe(263);
    expect(preview).toContain("bottom: '10mm'");
    expect(preview).toContain("minHeight: '12mm'");
    expect(exporter).toContain('FULL_SEATING_CHART_PDF_FOOTER_MASK_START_MM');
  });

  it('uses generated-left, centred-logo, page-right footer parity in preview and PDF', () => {
    expect(preview).toContain('gridTemplateColumns: \'1fr auto 1fr\'');
    expect(preview).toContain('data-footer-generated="true" style={{ justifySelf: \'start\'');
    expect(preview).toContain('data-footer-page-number="true" style={{ justifySelf: \'end\'');
    expect(preview).toContain("width: '36mm', height: '10mm'");
    expect(exporter).toContain('pdf.text(`Generated: ${timestamp}`, 12.7');
    expect(exporter).toContain('pdf.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH_MM - 12.7');
    expect(page).toContain('getFullSeatingChartGuestsPerPage(settings.fontSize)');
    expect(page.match(/exportFullSeatingChartToPdf\([^;]+settings/g)?.length).toBe(2);
  });

  it('keeps non-logo canvas elements black and preserves the original logo asset in preview and PDF', () => {
    expect(preview).toContain("color: '#000000'");
    expect(preview).toContain('stroke="#000000"');
    expect(preview).toContain("borderTop: '2px solid #000000'");
    expect(preview).toContain('/wedding-waitress-logo-brown.png?v=2');
    expect(exporter).toContain('const black = { r: 0, g: 0, b: 0 }');
    expect(exporter).toContain('pdf.setDrawColor(black.r, black.g, black.b)');
    expect(exporter).toContain("fetch('/wedding-waitress-logo-brown.png')");
    expect(exporter).toContain("drawDetail('/', { r: 0, g: 0, b: 0 })");
    expect(preview).not.toContain('> / </span>');
  });

  it('preserves PDF closing borders above the footer mask for every text size and column fill', () => {
    const borderWidth = 0.264583;
    const footerStart = CONTENT_START_MM + CONTENT_HEIGHT_MM;
    const footerMaskStart = footerStart + borderWidth;

    for (const size of ['small', 'standard', 'large'] as const) {
      const rowHeight = FULL_SEATING_CHART_ROW_HEIGHTS_MM[size];
      expect(CONTENT_START_MM + (25 * rowHeight)).toBe(footerStart);
      expect(CONTENT_START_MM + (3 * rowHeight)).toBeLessThan(footerStart);
      expect(footerMaskStart).toBeGreaterThan(footerStart);
    }

    expect(exporter).toContain('if (settings.showGuestList && guest1) pdf.line(leftColumnX, borderY, leftColumnX + columnWidth, borderY)');
    expect(exporter).toContain('if (settings.showGuestList && guest2) pdf.line(rightColumnX, borderY, rightColumnX + columnWidth, borderY)');
    expect(exporter).toContain('PAGE_HEIGHT_MM - FULL_SEATING_CHART_PDF_FOOTER_MASK_START_MM');
    expect(exporter).not.toContain("pdf.line(leftColumnX, borderY, rightColumnX + columnWidth, borderY)");
  });
});
