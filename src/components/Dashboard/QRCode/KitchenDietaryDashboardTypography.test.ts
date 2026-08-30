import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Kitchen Dietary Requirements dashboard typography', () => {
  const css = read('src/components/Dashboard/QRCode/KitchenDietaryChartPage.module.css');
  const page = read('src/components/Dashboard/QRCode/KitchenDietaryChart.tsx');
  const customizer = read('src/components/Dashboard/QRCode/DietaryChartCustomizer.tsx');

  it('uses the approved dashboard heading hierarchy', () => {
    expect(css).toMatch(/\.pageHeading,[\s\S]*\.majorHeading[\s\S]*font-size: 24px !important;[\s\S]*font-weight: 600 !important;/);
    expect(css).toMatch(/\.sectionHeading,[\s\S]*font-size: 20px !important;[\s\S]*font-weight: 500 !important;/);
    expect(page).toContain('styles.pageHeading');
    expect(customizer).toContain('styles.majorHeading');
  });

  it('uses the approved body, label, control, option, and counter typography', () => {
    expect(css).toMatch(/\.pageDescription,[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 400 !important;[\s\S]*line-height: 18px !important;/);
    expect(css).toMatch(/\.interfaceLabel,[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
    expect(css).toMatch(/\.paginationButton[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 500 !important;/);
    expect(css).toMatch(/\.portalSurface :is\(\[role="option"\], \[role="menuitem"\]\)[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 400 !important;[\s\S]*line-height: 18px !important;/);
    expect(css).toMatch(/\.statsPill,[\s\S]*\.paginationLabel[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 600 !important;/);
  });

  it('does not target the protected preview, print document, or PDF clone markers', () => {
    expect(css).toContain('.page *:not([data-dietary-a4-preview="true"]):not([data-dietary-a4-preview="true"] *)');
    expect(css).not.toContain('.print-page');
    expect(css).not.toContain('[data-pdf-text-nudge]');
  });
});
