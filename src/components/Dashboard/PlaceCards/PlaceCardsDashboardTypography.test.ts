import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Name Place Cards dashboard typography contract', () => {
  const pageCss = read('src/components/Dashboard/PlaceCards/PlaceCardsPage.module.css');
  const galleryCss = read('src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.module.css');
  const page = read('src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx');
  const customizer = read('src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx');
  const preview = read('src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx');

  it('uses the requested page and designer heading hierarchy', () => {
    expect(pageCss).toMatch(/\.headerPanel h1\s*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/ww-placecards-premium-designer[^{]*text-2xl[^{]*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/span\[class\*="rounded-full"\]\[class\*="border-primary"\][^{]*\{[\s\S]*?font-size:\s*20px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
    expect(galleryCss).toMatch(/\.title\s*\{[^}]*font-size:\s*20px;[^}]*font-weight:\s*500;/);
  });

  it('uses the requested supporting, label, button, and compact typography', () => {
    expect(pageCss).toMatch(/:is\(p, li\):not\(\[data-page\] \*\)[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(pageCss).toMatch(/headerPanel label,[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/:is\(button, \[role="tab"\]\):not\(\[data-page\] \*\)[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
    expect(pageCss).toMatch(/\.summaryText\s*\{[^}]*font-size:\s*13px\s*!important;[^}]*font-weight:\s*600\s*!important;/);
    expect(galleryCss).toMatch(/\.total\s*\{[^}]*font-size:\s*13px;[^}]*font-weight:\s*600;/);
  });

  it('keeps responsive tabs exact and portals feature-owned', () => {
    expect(pageCss).toMatch(/@media \(max-width:\s*480px\)[\s\S]*?\[role="tab"\][\s\S]*?font-size:\s*13px\s*!important;/);
    expect(pageCss).toMatch(/\[role="tab"\]\s*\{[^}]*display:\s*flex\s*!important;[^}]*flex-direction:\s*row\s*!important;[^}]*align-items:\s*center\s*!important;[^}]*justify-content:\s*center\s*!important;[^}]*gap:\s*6px\s*!important;[^}]*white-space:\s*nowrap\s*!important;/);
    expect(pageCss).toMatch(/@media \(max-width:767px\)[\s\S]*?\[role="tablist"\][\s\S]*?overflow-x:\s*auto;[\s\S]*?\[role="tab"\][\s\S]*?min-width:\s*max-content\s*!important;/);
    expect(customizer).toMatch(/<Palette[^>]*\/>\s*Design/);
    expect(customizer).toMatch(/<Move[^>]*\/>\s*Text Position/);
    expect(customizer).toMatch(/<Image[^>]*\/>\s*Background/);
    expect(customizer).toMatch(/<QrCode[^>]*\/>\s*Add QR Code/);
    expect(customizer).toMatch(/<MessageSquareText[^>]*\/>\s*Messages/);
    expect(page).toContain('ww-placecards-portal');
    expect(customizer).toContain('ww-placecards-portal');
  });

  it('does not apply interface typography to the protected card sheets', () => {
    expect(pageCss).toContain(':not([data-page] *)');
    expect(pageCss).not.toContain(':global([data-page');
    expect(preview).toContain('data-page={currentPage - 1}');
    expect(preview).toContain('data-page={pageIndex}');
  });
});
