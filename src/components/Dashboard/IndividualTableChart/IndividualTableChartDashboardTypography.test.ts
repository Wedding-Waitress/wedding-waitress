import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('Individual Table Charts dashboard typography contract', () => {
  it('defines the requested interface hierarchy', () => {
    const css = read('src/components/Dashboard/IndividualTableChart/IndividualTableChartPage.module.css');
    expect(css).toMatch(/\.pageHeading,[\s\S]*font-size:\s*24px\s*!important;[\s\S]*font-weight:\s*600\s*!important;/);
    expect(css).toMatch(/\.pageDescription,[\s\S]*font-size:\s*13px\s*!important;[\s\S]*font-weight:\s*400\s*!important;[\s\S]*line-height:\s*18px\s*!important;/);
    expect(css).toMatch(/\.sectionHeading\s*\{[\s\S]*font-size:\s*20px\s*!important;[\s\S]*font-weight:\s*500\s*!important;/);
    expect(css).toMatch(/\.interfaceLabel,[\s\S]*font-size:\s*13px\s*!important;[\s\S]*font-weight:\s*600\s*!important;/);
    expect(css).toMatch(/\.compactCounter\s*\{[\s\S]*font-size:\s*13px\s*!important;[\s\S]*font-weight:\s*600\s*!important;/);
  });

  it('keeps typography selectors outside the authoritative A4 renderer', () => {
    const css = read('src/components/Dashboard/IndividualTableChart/IndividualTableChartPage.module.css');
    expect(css).not.toContain('IndividualTableChartPrintPage');
    expect(css).not.toMatch(/#printA4-individual-table\s*\{/);
    expect(css).not.toMatch(/data-individual-table-chart-page[^)]*\{/);

    const preview = read('src/components/Dashboard/IndividualTableChart/IndividualTableChartPreview.tsx');
    expect(preview).toContain('<IndividualTableChartPrintPage');
    expect(preview).toContain('...A4_PAGE_STYLE');
  });

  it('covers the feature-owned dialog and portal without global selectors', () => {
    const exporter = read('src/components/Dashboard/IndividualTableChart/IndividualTableChartExporter.tsx');
    expect(exporter).toContain('styles.featureDialogTypography');
    expect(exporter).toContain('styles.portalTypography');
  });
});
