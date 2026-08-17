import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIETARY_A4_LAYOUT, DIETARY_REPORT_TEXT_COLOR } from './dietaryChartA4Layout';

const root = process.cwd();
const previewSource = fs.readFileSync(path.join(root, 'src/components/Dashboard/QRCode/KitchenDietaryChart.tsx'), 'utf8');
const pdfSource = fs.readFileSync(path.join(root, 'src/lib/dietaryChartPdfExporter.ts'), 'utf8');

describe('dietary chart A4 header and footer', () => {
  it('mirrors the approved Individual Table Charts chrome measurements', () => {
    expect(DIETARY_A4_LAYOUT).toMatchObject({
      widthMm: 210,
      heightMm: 297,
      paddingTopMm: 8,
      paddingRightMm: 12.7,
      paddingBottomMm: 10,
      paddingLeftMm: 12.7,
      eventNameFontPt: 16,
      eventNameLineHeight: 1.25,
      reportTitleFontPt: 11,
      reportTitleMarginTopPx: 3,
      detailsFontPt: 8,
      detailsLineHeight: 1.35,
      detailsMarginTopPx: 5,
      separatorMarginTopPx: 7,
      separatorWidthPx: 1,
      footerMinHeightMm: 12,
      footerFontPt: 8,
      logoWidthMm: 36,
      logoHeightMm: 10,
    });
    expect(DIETARY_REPORT_TEXT_COLOR).toBe('#000000');
  });

  it('uses one black, three-column footer and exports that rendered preview', () => {
    expect(previewSource).toContain('data-footer-layout="three-column"');
    expect(previewSource).toContain('Generated: {formatGeneratedTimestamp()}');
    expect(previewSource).toContain('Page {currentPage} of {totalPages}');
    expect(previewSource).toContain('Page {pageIndex + 1} of {totalPages}');
    expect(previewSource).toContain('data-dietary-a4-preview="true"');
    expect(pdfSource).toContain('const pageElement = getPageElement()');
    expect(pdfSource).toContain('await html2canvas(pageElement');
    expect(pdfSource).toContain("pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297");
  });

  it('keeps deliberate field colours as the only guest-text overrides', () => {
    expect(previewSource).toContain('color: settings.guestNameColor');
    expect(previewSource).toContain('color: settings.guestListColor');
    expect(previewSource).toContain('color: settings.dietaryColor');
    expect(previewSource).toContain('color: settings.relationshipColor');
    expect(previewSource).toContain('color: settings.seatNumberColor');
    expect(pdfSource).toContain('await html2canvas(pageElement');
  });

  it('nudges only requested text upward in the cloned PDF document', () => {
    expect(previewSource).toContain('data-pdf-text-nudge="details"');
    expect(previewSource).toContain('data-pdf-text-nudge="total"');
    expect(previewSource).toContain('data-pdf-text-nudge="summary"');
    expect(previewSource).toContain('data-pdf-text-nudge="column-heading"');
    expect(previewSource).toContain('data-pdf-text-nudge="guest-cell"');
    expect(previewSource.match(/data-pdf-text-nudge="summary"/g)).toHaveLength(1);
    expect(previewSource.match(/data-pdf-text-nudge="column-heading"/g)).toHaveLength(7);
    expect(previewSource.match(/data-pdf-text-nudge="guest-cell"/g)).toHaveLength(7);
    expect(pdfSource).toContain('summary: -8');
    expect(pdfSource).toContain('columnHeading: -8');
    expect(pdfSource).toContain('guestCell: -6');
    expect(pdfSource).toContain('onclone: alignDietaryPdfTextInClone');
  });
});
