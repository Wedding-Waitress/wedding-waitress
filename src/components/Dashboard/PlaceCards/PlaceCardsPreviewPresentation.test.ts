import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Name Place Cards preview presentation contract', () => {
  const pageCss = read('src/components/Dashboard/PlaceCards/PlaceCardsPage.module.css');
  const preview = read('src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx');

  it('keeps the outer preview stage transparent while retaining the paper shadow', () => {
    expect(pageCss).toMatch(/\.previewStage\s*\{[\s\S]*?border:\s*0\s*!important;[\s\S]*?border-radius:\s*0\s*!important;[\s\S]*?background:\s*transparent\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;/);
    expect(preview).toContain('shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]');
    expect(preview).toContain("width: '210mm'");
    expect(preview).toContain("height: '297mm'");
  });

  it('reserves a responsive, unclipped gutter for all three preview-only labels', () => {
    expect(pageCss).toContain('--ww-placecards-guide-gutter: 132px');
    expect(pageCss).toContain('padding-left: var(--ww-placecards-guide-gutter)');
    expect(pageCss).not.toMatch(/ww-placecards-guide-row[^}]*display:\s*none/);
    expect(preview).toContain('ww-placecards-guide-layer');
    expect(preview).toContain('Back of card');
    expect(preview).toContain('Fold');
    expect(preview).toContain('Front of card');
    expect(preview).toContain("top: '8.333333%'");
    expect(preview).toContain("top: '16.666667%'");
    expect(preview).toContain("top: '25%'");
  });

  it('keeps guide labels out of the print-only renderer', () => {
    const printRendererStart = preview.indexOf('{/* Print Version - All Pages */}');
    expect(printRendererStart).toBeGreaterThan(0);
    expect(preview.slice(printRendererStart)).not.toContain('ww-placecards-guide-layer');
  });
});
