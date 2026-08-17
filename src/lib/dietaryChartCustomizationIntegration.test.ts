import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const pageSource = fs.readFileSync(path.join(root, 'src/components/Dashboard/QRCode/KitchenDietaryChart.tsx'), 'utf8');
const controlsSource = fs.readFileSync(path.join(root, 'src/components/Dashboard/QRCode/DietaryChartCustomizer.tsx'), 'utf8');
const pdfSource = fs.readFileSync(path.join(root, 'src/lib/dietaryChartPdfExporter.ts'), 'utf8');

describe('dietary chart customisation integration', () => {
  it.each([
    ['guestNameColor', 'guest names'],
    ['guestListColor', 'guest list'],
    ['dietaryColor', 'dietary requirements'],
    ['relationshipColor', 'relationships'],
    ['seatNumberColor', 'seat numbers'],
  ])('keeps %s independent from its visibility toggle', (setting, label) => {
    expect(controlsSource).toContain(`selected={settings.${setting}}`);
    expect(controlsSource).toContain(`name="${label}"`);
    expect(controlsSource).toContain(`onSettingsChange({ ${setting} })`);
    expect(pageSource).toContain(`color: settings.${setting}`);
    expect(pdfSource).toContain('await html2canvas(pageElement');
  });

  it('keeps mobile values visible and table headings structurally fixed', () => {
    expect(controlsSource).not.toContain('Show Mobile');
    expect(pageSource).toContain('data-dietary-field="mobile"');
    expect(pageSource).toContain("{guest.mobile || '-'}");
    expect(pageSource).toContain('>Mobile</th>');
  });

  it('keeps all seven columns while independently controlling their values', () => {
    expect(pageSource).toContain("data-dietary-field=\"first-name\"");
    expect(pageSource).toContain("data-dietary-field=\"last-name\"");
    expect(pageSource).toContain("settings.showGuestNames ? guest.first_name : ''");
    expect(pageSource).toContain("settings.showGuestNames ? guest.last_name || '-' : ''");
    expect(pageSource).toContain("settings.showSeatNumbers ? guest.seat_no || '-' : ''");
    expect(pageSource).toContain("settings.showDietary ? guest.dietary : ''");
    expect(pageSource).toContain("settings.showGuestList && paginatedGuests.map");
  });

  it('exports the selected preview page or every authoritative preview page', () => {
    expect(pageSource).toContain('pageNumbers: [currentPage]');
    expect(pageSource).toContain('pageNumbers: pagination.pages.map((_, index) => index + 1)');
    expect(pageSource.match(/getPageElement: \(\) => a4PreviewRef\.current/g)?.length).toBe(2);
  });

  it('applies guest size only to preview guest rows and captures that exact rendering', () => {
    expect(pageSource).toContain('DIETARY_GUEST_TEXT_SIZES[settings.fontSize]');
    expect(pageSource).toContain('data-footer-exclusion-zone="true"');
    expect(pdfSource).toContain('const pageElement = getPageElement()');
    expect(pdfSource).toContain('await html2canvas(pageElement');
  });

  it('uses direct 25-guest preview groups for all three text sizes', () => {
    expect(pageSource).toContain('const pages = chunkDietaryGuests(dietaryGuests, 25)');
    expect(pageSource).toContain('data-page-guest-count={paginatedGuests.length}');
    expect(pageSource).toContain('pageNumbers: [currentPage]');
    expect(pageSource).toContain('pageNumbers: pagination.pages.map((_, index) => index + 1)');
  });

  it('uses 3.5pt vertical padding only for preview guest cells and their measurement mirror', () => {
    expect(pageSource.match(/py-\[3\.5pt\]/g)?.length).toBe(14);
    expect(pageSource).toContain('py-[3px] px-[4pt] font-bold');
  });

  it('keeps Australian A4 dimensions in the PDF exporter', () => {
    expect(pdfSource).toContain("format: 'a4'");
    expect(pdfSource).toContain("pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297");
  });

  it('waits for preview assets and restores the visible page after export', () => {
    expect(pdfSource).toContain('await document.fonts.ready');
    expect(pdfSource).toContain('image.complete');
    expect(pdfSource).toContain('await renderPage(pageNumbers[index])');
    expect(pdfSource).toContain('await renderPage(currentPage)');
  });
});
