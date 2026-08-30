import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('Reception Floor Plan glossy theme scope', () => {
  const theme = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanTheme.module.css');
  const page = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanPage.tsx');
  const canvas = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas.tsx');
  const shell = read('src/components/Dashboard/FloorPlan/FloorPlanPage.tsx');
  const share = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ShareLinkPanel.tsx');

  it('inherits the shared application canvas behind the stable Reception mode boundary', () => {
    expect(theme).toContain('main[data-dashboard-content]:has([data-floor-plan-mode="reception"])');
    expect(theme).not.toContain('dashboard-mocha-liquid-glass.png');
    expect(theme).not.toContain('background-size: cover');
    expect(theme).toContain('min-height: 100dvh');
    expect(shell).toContain('data-floor-plan-mode={floorPlanType}');
    expect(shell).toContain('receptionStyles.receptionPage');
  });

  it('marks every major interface region without duplicating the technical canvas', () => {
    expect(page).toContain('data-reception-master-card="true"');
    expect(page).not.toContain('data-reception-toolbar="true"');
    expect(page).not.toContain('Reception Floor Plan</h2>');
    expect(page).not.toContain('data-reception-workspace-status="true"');
    expect(page.match(/<ReceptionFloorPlanCanvas/g)).toHaveLength(1);
    expect(canvas.match(/data-reception-document-area="true"/g)).toHaveLength(1);
    expect(canvas).toContain('relative bg-white border-2');
    expect(theme).toContain('[data-reception-document-area="true"]');
  });

  it('reuses the Ceremony Layout Settings master-panel treatment while keeping the A4 wrapper transparent', () => {
    const ceremonyTheme = read('src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanSettings.module.css');
    const sharedSurfaceTokens = [
      'radial-gradient(circle at 82% 0%, rgba(224, 169, 107, 0.12), transparent 34%)',
      'linear-gradient(150deg, rgba(84, 46, 34, 0.88), rgba(23, 11, 8, 0.95))',
      'inset 0 1px 0 rgba(255, 239, 218, 0.18)',
      'inset 0 -1px 0 rgba(56, 27, 19, 0.58)',
      '0 20px 44px rgba(3, 1, 1, 0.36)',
      'backdrop-filter: blur(18px) saturate(1.08)',
    ];

    for (const token of sharedSurfaceTokens) {
      expect(ceremonyTheme).toContain(token);
      expect(theme).toContain(token);
    }
    expect(theme).toMatch(/\.masterCard\s*\{[^}]*border: 1px solid var\(--reception-border\) !important;/);
    expect(theme).toMatch(/\[data-reception-document-area="true"\][^}]*background: transparent !important;/);
    expect(theme).not.toMatch(/\.masterCard\s*\{[^}]*background: transparent !important;/);
  });

  it('keeps the styling Reception-only and provides responsive, semantic, and portal treatments', () => {
    expect(theme).not.toContain('data-floor-plan-mode="ceremony"');
    expect(theme).toContain('[data-reception-status="good"]');
    expect(theme).toContain('[data-reception-status="warn"]');
    expect(theme).toContain('[data-reception-status="bad"]');
    expect(theme).toContain('.reception-portal-surface');
    expect(theme).toContain('@media (max-width: 767px)');
    expect(theme).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('retains the established Reception interaction and export wiring', () => {
    expect(page).toContain('exportReceptionPreviewToPdf');
    expect(page).toContain('pageElement: receptionA4Ref.current');
    expect(page).toContain('onConfirm={handleReset}');
    expect(page).toContain('onApply={update}');
    expect(page).toContain('onChange={update}');
    expect(page).toContain('onGenerate={generateShareToken}');
    expect(page).toContain('onRevoke={revokeShareToken}');
    expect(canvas).toContain('onDragStart={');
    expect(canvas).toContain('onRotate={');
    expect(canvas).toContain('onToggleLock={');
    expect(canvas).toContain('onRemove={');
  });

  it('moves the existing Reception controls into the shared header without exposing autosave status', () => {
    expect(shell).toContain('data-reception-header-controls="true"');
    expect(page).toContain('createPortal(headerControls, headerControlsContainer)');
    expect(page.match(/Reset layout/g)).toHaveLength(1);
    expect(page.match(/Export Controls/g)).toHaveLength(1);
    expect(page).toContain("exporting ? 'Exporting...' : 'Download PDF'");
    expect(page).not.toContain("Saved{' '}");
    expect(page).not.toContain('last_saved_at');
    expect(page).toContain('headerStyles.exportControls');
    expect(page).toContain('headerStyles.exportButton');
    expect(shell).toContain('xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.72fr)_auto_auto]');
    expect(shell).toContain('xl:contents');
    expect(page).toContain('variant="destructive"');
    expect(theme).toContain('border: 1px solid rgba(248, 113, 113, 0.62) !important');
  });

  it('embeds the single approval selector inside venue sharing without changing persistence wiring', () => {
    expect(page).not.toContain('<ApprovalStatusPanel');
    expect(page).toContain('onApprovalChange={update}');
    expect(share.match(/<ApprovalStatusPanel/g)).toHaveLength(1);
    expect(share).toContain('onChange={onApprovalChange}');
    expect(share).toContain('onCheckedChange={toggle}');
    expect(share).toContain('await onGenerate()');
    expect(share).toContain('await onRevoke()');
  });
});
