import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Seating Chart Signs dashboard typography contract', () => {
  const page = read('src/components/Dashboard/Signage/SignagePage.tsx');
  const pageCss = read('src/components/Dashboard/Signage/SignagePage.module.css');
  const galleryCss = read('src/components/Dashboard/Signage/SignageGalleryModal.module.css');
  const customizer = read('src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx');
  const preview = read('src/components/Dashboard/Invitations/InvitationCardPreview.tsx');
  const exporter = read('src/lib/signagePdfExporter.ts');

  it('defines the requested page and designer heading hierarchy', () => {
    expect(pageCss).toMatch(/\.pageHeader h1\s*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/\.printStudio > div:first-child > h3[^{]*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/ww-signage-typography-designer[^\n]*text-2xl[^{]*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/ww-signage-guidelines-title[^{]*\{[\s\S]*?font-size:\s*20px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
  });

  it('defines print-card, supporting, control, and compact typography', () => {
    expect(pageCss).toMatch(/\.printSizeTitle\s*\{[^}]*font-size:\s*20px\s*!important;[^}]*font-weight:\s*500\s*!important;/);
    expect(pageCss).toMatch(/\.supportingText[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(pageCss).toMatch(/\.compactIndicator[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toContain('font-size: 13px !important;');
    expect(pageCss).not.toContain('font-size: 0.62rem');
  });

  it('covers every supported size and designer tab without global typography', () => {
    for (const label of ['A1', 'A2', 'A3', 'A4', 'A5', 'DL Card', 'Postcard', 'Business Card']) {
      expect(page).toContain(`label: '${label}'`);
    }
    for (const label of ['Text Zones', 'Background', 'Add QR Code', 'Messages']) {
      expect(customizer).toContain(label);
    }
    expect(page).toContain('signageTypography');
    expect(customizer).toContain('ww-signage-typography-designer');
    expect(customizer).toContain('ww-signage-typography-portal');
    expect(galleryCss).toContain('.libraryDialog :is(h2, h3)');
  });

  it('keeps the approved sign preview and exporter outside typography styling', () => {
    expect(pageCss).toContain('preview stage is deliberately');
    expect(pageCss).not.toContain('.InvitationCardPreview');
    expect(preview).toContain('PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL');
    expect(exporter).toContain('function buildOverlayElement');
    expect(exporter).toContain('export async function exportSignagePDF');
  });

  it('scopes the approved light interface palette away from shared printable pages and the sign renderer', () => {
    expect(page).toContain('styles.signageLightSurface');
    expect(page).toContain('portalScopeClassName="ww-signage-studio-portal"');
    expect(pageCss).toContain('@scope (.signageLightSurface)');
    expect(pageCss).toContain('background: #f2e9dc;');
    expect(pageCss).toContain('background: #fbf8f2 !important;');
    expect(pageCss).toContain('linear-gradient(180deg, #4ade80 0%, #22c55e 58%, #16a34a 100%)');
    expect(pageCss).toContain(':global(.ww-signage-studio-portal)');
    expect(pageCss).not.toMatch(/\.previewStage\s+\*\s*\{/);
    expect(galleryCss).toContain('Approved light champagne skin');
  });

  it('keeps the root-specific light repair outside the scoped block', () => {
    expect(pageCss).toContain(':global(#root) .signageLightSurface .mainStudio');
    expect(pageCss).toContain(':global(#root) .signageLightSurface .designerShell');
    expect(pageCss).toContain('.signageWorkspaceSurface');
    expect(pageCss.indexOf('Root-cause correction')).toBeGreaterThan(pageCss.indexOf('@scope (.signageLightSurface)'));
  });
});
