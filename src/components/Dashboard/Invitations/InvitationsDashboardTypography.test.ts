import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Invitations & Cards dashboard typography contract', () => {
  const pageCss = read('src/components/Dashboard/Invitations/InvitationsPage.module.css');
  const galleryCss = read('src/components/Dashboard/Invitations/InvitationGalleryModal.module.css');
  const page = read('src/components/Dashboard/Invitations/InvitationsPage.tsx');
  const customizer = read('src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx');
  const preview = read('src/components/Dashboard/Invitations/InvitationCardPreview.tsx');
  const exporter = read('src/lib/invitationExporter.ts');
  const dashboard = read('src/pages/Dashboard.tsx');

  it('defines the requested page, designer, and section heading hierarchy', () => {
    expect(pageCss).toMatch(/\.headerPanel h1\s*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/ww-invitations-designer[^\n]*text-2xl[^{]*\{[\s\S]*?font-size:\s*24px\s*!important;[\s\S]*?font-weight:\s*600\s*!important;/);
    expect(pageCss).toMatch(/ww-invitations-section-heading[^{]*\{[\s\S]*?font-size:\s*20px\s*!important;[\s\S]*?font-weight:\s*500\s*!important;/);
    expect(galleryCss).toMatch(/\.title\s*\{[^}]*font-size:\s*20px;[^}]*font-weight:\s*500;/);
  });

  it('defines body, label, button, tile, badge, and zoom typography', () => {
    expect(pageCss).toMatch(/:is\(p, li\):not\(\.previewStage \*\)[^{]*\{[\s\S]*?font-size:\s*13px\s*!important;[\s\S]*?font-weight:\s*400\s*!important;[\s\S]*?line-height:\s*18px\s*!important;/);
    expect(pageCss).toMatch(/\.artworkTitle\s*\{[^}]*font-size:\s*20px\s*!important;[^}]*font-weight:\s*500\s*!important;/);
    expect(pageCss).toMatch(/\.managementPanel \[role="tab"\]\s*\{[^}]*font-size:\s*13px\s*!important;[^}]*font-weight:\s*500\s*!important;/);
    expect(pageCss).toMatch(/\.previewStage \[class\*="self-center"\] > span\s*\{[^}]*font-size:\s*13px\s*!important;[^}]*font-weight:\s*600\s*!important;/);
    expect(galleryCss).toMatch(/\.total\s*\{[^}]*font-size:\s*13px;[^}]*font-weight:\s*600;/);
  });

  it('keeps all card types and designer tabs on the same breakpoint-invariant scale', () => {
    for (const label of ['Invitation', 'Save the Date', 'Thank You']) expect(page).toContain(label);
    for (const label of ['Text Zones', 'Background', 'Add QR Code', 'Messages']) expect(customizer).toContain(label);
    expect(pageCss).not.toContain('font-size: 0.72rem');
    expect(pageCss).not.toContain('font-size: 0.65625rem');
  });

  it('keeps preview and export rendering outside the typography selectors', () => {
    expect(pageCss).toContain(':not(.previewStage *)');
    expect(pageCss).not.toContain('.InvitationCardPreview');
    expect(preview).toContain('PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL');
    expect(exporter).toContain('export function buildInvitationElement');
    expect(exporter).toContain('export async function captureElement');
  });

  it('uses invitation-local interface classes without importing the dark signage shell', () => {
    expect(page).toContain('${styles.selectTrigger} w-full');
    expect(page).toContain('${styles.infoStrip} rounded-xl');
    expect(page).toContain('${styles.designerShell} 2xl:col-span-2');
    expect(page).not.toContain("SignagePage.module.css");
    expect(page).not.toContain('premiumStyles.');
    expect(pageCss).toContain('.invitationsWorkspaceSurface');
    expect(pageCss).toContain(':global(main[data-dashboard-content]).invitationsWorkspaceSurface');
    expect(dashboard).toContain("activeTab === 'invitations' ? ` ${invitationsPageStyles.invitationsWorkspaceSurface}`");
    expect(pageCss).not.toMatch(/\.page :is\(h1, h2, h3, h4, label, strong\)\s*,\s*\n:global\(#root\) \.page \[class\*="text-foreground"\]/);
  });
});
