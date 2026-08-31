import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const themeSource = readFileSync(
  resolve(process.cwd(), 'src/components/Dashboard/RunningSheet/RunningSheetTheme.module.css'),
  'utf8',
);
const qrThemeSource = readFileSync(
  resolve(process.cwd(), 'src/components/Dashboard/QRCode/QRCodeSeatingChart.module.css'),
  'utf8',
);
const sectionSource = readFileSync(
  resolve(process.cwd(), 'src/components/Dashboard/RunningSheet/RunningSheetSection.tsx'),
  'utf8',
);
const rowSource = readFileSync(
  resolve(process.cwd(), 'src/components/Dashboard/RunningSheet/RunningSheetRow.tsx'),
  'utf8',
);
const pageSource = readFileSync(
  resolve(process.cwd(), 'src/components/Dashboard/RunningSheet/RunningSheetPage.tsx'),
  'utf8',
);
const dashboardSource = readFileSync(resolve(process.cwd(), 'src/pages/Dashboard.tsx'), 'utf8');

describe('Running Sheet light luxury dashboard theme', () => {
  it('covers the explicitly scoped dashboard shell and long main document', () => {
    expect(themeSource).toContain(':global(.ww-running-sheet-shell)');
    expect(themeSource).toContain(':global(.ww-running-sheet-main)');
    expect(themeSource).toMatch(/min-height:\s*100dvh/);
    expect(themeSource).not.toContain('dashboard-mocha-liquid-glass.png');
    expect(dashboardSource).toContain('ww-application-background');
    expect(themeSource).not.toContain('linear-gradient(rgba(20, 9, 7');
  });

  it('uses the approved light champagne dashboard palette without changing the public baseline', () => {
    expect(qrThemeSource).toContain('#eadbc9');
    expect(themeSource).toContain('--rs-page: #f4eadb');
    expect(themeSource).toContain('--rs-panel: #fffdf8');
    expect(themeSource).toContain('--rs-field: #fffaf2');
    expect(themeSource).toContain('background: linear-gradient(135deg, #f7efe3 0%, #f1e5d4 55%, #eadbc6 100%)');
    expect(themeSource).toContain('.publicPage {');
  });

  it('sets explicit high-contrast headings, supporting text, icons, fields and placeholders', () => {
    expect(themeSource).toMatch(/\.page h1,[\s\S]*color:\s*var\(--rs-white\)\s*!important/);
    expect(themeSource).toContain('color: var(--rs-cream) !important');
    expect(themeSource).toContain('color: var(--rs-gold) !important');
    expect(themeSource).toContain('background: var(--rs-field) !important');
    expect(themeSource).toContain('color: var(--rs-muted) !important');
    expect(themeSource).toContain('background: linear-gradient(180deg, #4ade80 0%, #22c55e 58%, #16a34a 100%)');
  });

  it('locks green primary button labels and icon strokes to white', () => {
    expect(themeSource).toMatch(/\.page \.greenAction\.greenAction svg[\s\S]*stroke:\s*#fff\s*!important/);
    expect(themeSource).toContain('.publicPage .greenAction.greenAction svg');
    expect(themeSource).toContain('.shareModal .primaryAction.primaryAction svg');
    expect(themeSource).toContain('svg [fill="currentColor"]');
  });

  it('uses a light, high-contrast Notes editor with aligned readable body text', () => {
    expect(sectionSource).toContain('styles.notesEditor');
    expect(sectionSource).toContain('styles.notesHeading');
    expect(sectionSource).toContain('styles.notesTextarea');
    expect(sectionSource).not.toMatch(/showNotes[\s\S]{0,800}bg-background px-3 py-2/);
    expect(themeSource).toMatch(/\.notesEditor\s*\{[\s\S]*border-color:\s*#d9bf98;[\s\S]*background:\s*#f8ead7/);
    expect(themeSource).toMatch(/\.notesTextarea\s*\{[\s\S]*padding:\s*0\.65rem 0\.9rem 0\.65rem 2rem\s*!important/);
    expect(themeSource).toMatch(/\.notesTextarea::placeholder[\s\S]*color:\s*var\(--rs-muted\)\s*!important/);
  });

  it('keeps shared public and modal typography defaults isolated from the dashboard page', () => {
    expect(themeSource).toContain('--rs-font: var(--ww-interface-font-family)');
    expect(themeSource).toContain('--rs-page-heading-size: 24px');
    expect(themeSource).toContain('--rs-page-heading-weight: 700');
    expect(themeSource).toContain('--rs-page-heading-line-height: 31px');
    expect(themeSource).toContain('--rs-section-heading-size: 20px');
    expect(themeSource).toContain('--rs-section-heading-weight: 700');
    expect(themeSource).toContain('--rs-section-heading-line-height: 26px');
    expect(themeSource).toContain('--rs-control-size: 14px');
    expect(themeSource).toContain('--rs-control-weight: 600');
    expect(themeSource).toContain('--rs-control-line-height: 20px');
    expect(themeSource).toContain('--rs-support-size: 14px');
    expect(themeSource).toContain('--rs-support-weight: 400');
    expect(themeSource).toContain('--rs-support-line-height: 20px');
    expect(themeSource).toContain('--rs-body-size: 14px');
    expect(themeSource).toContain('--rs-body-weight: 400');
    expect(themeSource).toContain('--rs-body-line-height: 20px');
    expect(themeSource).toContain('--rs-button-size: 14px');
    expect(themeSource).toContain('--rs-button-weight: 600');
    expect(themeSource).toContain('--rs-button-line-height: 20px');
    expect(themeSource).toMatch(/\.pageHeader h1\s*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(themeSource).toMatch(/\.page \.sectionHeading,[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(themeSource).toMatch(/\.page \.supportingText\s*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
  });

  it('applies the dashboard event-detail, column and schedule typography without changing explicit formatting', () => {
    expect(themeSource).toMatch(/\.eventDetailLabel\s*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(themeSource).toMatch(/\.eventDetailText\s*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(themeSource).toMatch(/\.page \.columnHeader\s*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(themeSource).toMatch(/\.page \.bodyText\s*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(pageSource.match(/styles\.eventDetailLabel/g)).toHaveLength(2);
    expect(pageSource.match(/styles\.eventDetailText/g)).toHaveLength(6);
    expect(pageSource).toContain('<h2 className="text-xl font-semibold text-primary">{selectedEvent.name}</h2>');
    expect(themeSource).toContain('.bodyText:global(.font-bold) { font-weight: 700 !important; }');
    expect(themeSource).toContain('.bodyText:global(.italic) { font-style: italic !important; }');
    expect(themeSource).toContain('.bodyText:global(.underline) { text-decoration-line: underline !important; }');
    expect(rowSource.match(/styles\.bodyText/g)).toHaveLength(3);
    expect(rowSource).toContain("const headerClasses = isHeader ? 'text-destructive' : '';");
    expect(rowSource).not.toContain("isHeader ? 'font-bold text-destructive'");
    expect(themeSource).toMatch(/ww-running-sheet-menu \[role="menuitem"\][\s\S]*font-size:\s*14px\s*!important[\s\S]*font-weight:\s*400\s*!important[\s\S]*line-height:\s*20px\s*!important/);
  });

  it('removes smaller component button and column typography overrides', () => {
    expect(pageSource).not.toMatch(/greenAction[^`]*text-xs/);
    expect(sectionSource).not.toMatch(/columnHeader[^`]*text-xs/);
    expect(themeSource).not.toContain('font-size: 0.9rem !important');
    expect(dashboardSource).toContain("BROWN_OUTLINE_TABS.has(activeTab) && activeTab !== 'running-sheet' ? ' ww-heading-system' : ''");
  });

  it('keeps meaningful schedule highlighting red and interactive overlays themed', () => {
    expect(themeSource).toContain('.scheduleCard textarea.text-destructive');
    expect(themeSource).toContain(':global(.ww-running-sheet-menu)');
    expect(themeSource).toContain(':global(.ww-running-sheet-tooltip)');
  });

  it('stacks editable rows without horizontal document overflow on phones', () => {
    expect(themeSource).toContain('@media (min-width: 640px) and (max-width: 1023px)');
    expect(themeSource).toMatch(/\.eventField\s*\{\s*grid-column:\s*2 \/ 4/);
    expect(themeSource).toContain('@media (max-width: 639px)');
    expect(themeSource).toMatch(/\.scheduleRow\s*\{[\s\S]*grid-template-columns:\s*2rem minmax\(0, 1fr\) 2\.5rem/);
    expect(themeSource).toMatch(/\.timeField, \.eventField, \.whoField\s*\{\s*grid-column:\s*2/);
    expect(themeSource).toContain('.eventField { grid-row: 2; }');
  });

  it('keeps the approved dashboard typography invariant at desktop, tablet and mobile widths', () => {
    const responsiveRules = themeSource.slice(themeSource.indexOf('@media (max-width: 767px)'));
    expect(responsiveRules).not.toMatch(/\.page \.supportingText\s*\{[\s\S]{0,120}(?:font-size|font-weight|line-height)/);
    expect(responsiveRules).not.toMatch(/\.page \.bodyText\s*\{[\s\S]{0,120}(?:font-size|font-weight|line-height)/);
    expect(rowSource).toContain('styles.mobileFieldLabel');
    expect(themeSource).toContain('@media (min-width: 640px) and (max-width: 1023px)');
    expect(themeSource).toContain('@media (max-width: 639px)');
  });

  it('isolates the public espresso glass presentation from authenticated and PDF output', () => {
    expect(themeSource).toContain('Public Run Sheet share page: screen-only espresso liquid-glass presentation');
    expect(themeSource).toMatch(/@media screen\s*\{[\s\S]*\.publicPage\s*\{[\s\S]*linear-gradient\(135deg, #110705 0%, #2b130e 48%, #140806 100%\)/);
    expect(themeSource).toMatch(/\.publicPage \.scheduleRow,[\s\S]*background:\s*rgba\(31, 15, 11, 0\.36\)\s*!important/);
    expect(themeSource).toMatch(/\.publicPage \.notesEditor\s*\{[\s\S]*background:\s*var\(--rs-inset\)/);
    expect(themeSource).toContain('.publicFooter {');
    expect(themeSource).toContain('@media screen and (max-width: 1023px)');
    expect(themeSource).toContain('@media screen and (max-width: 767px)');
    expect(themeSource).not.toMatch(/@media print[\s\S]*\.publicPage/);
  });
});
