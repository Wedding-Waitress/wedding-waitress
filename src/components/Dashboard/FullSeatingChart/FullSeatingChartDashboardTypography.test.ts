import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Full Seating Chart dashboard typography', () => {
  const css = read('src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.module.css');
  const page = read('src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx');
  const customizer = read('src/components/Dashboard/FullSeatingChart/FullSeatingChartCustomizer.tsx');
  const shareModal = read('src/components/Dashboard/FullSeatingChart/SeatingChartShareModal.tsx');

  it('uses the approved dashboard heading hierarchy', () => {
    expect(css).toMatch(/\.pageHeading,[\s\S]*\.majorHeading[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 600 !important;/);
    expect(css).toMatch(/\.sectionHeading,[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 500 !important;/);
    expect(page).toContain('styles.pageHeading');
    expect(customizer).toContain('styles.majorHeading');
    expect(shareModal).toContain('styles.shareDialog');
  });

  it('uses the approved labels, body, controls, and compact status typography', () => {
    expect(css).toMatch(/\.pageDescription,[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 400 !important;[\s\S]*line-height: 18px !important;/);
    expect(css).toMatch(/\.interfaceLabel,[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
    expect(css).toMatch(/\.statsPill,[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
    expect(css).toMatch(/\[data-full-seating-pagination="true"\] button[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 500 !important;/);
    expect(css).toMatch(/\.portalSurface :is\(\[role="option"\], \[role="menuitem"\]\)[\s\S]*font-weight: 400 !important;/);
  });

  it('does not target the protected A4 document', () => {
    expect(css).not.toContain('[data-a4-preview-page="true"]');
    expect(css).not.toContain('#full-seating-print-content');
    expect(css).not.toContain('.print-page');
  });
});
