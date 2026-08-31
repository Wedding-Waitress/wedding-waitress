import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Ceremony Floor Plan page composition', () => {
  it('places one settings instance above one shared A4 preview with no remount key', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.tsx'), 'utf8');
    expect(source.match(/<CeremonyFloorPlanSettings/g)).toHaveLength(1);
    expect(source.match(/<CeremonyFloorPlanA4Preview/g)).toHaveLength(1);
    expect(source.indexOf('<CeremonyFloorPlanSettings')).toBeLessThan(source.indexOf('<CeremonyFloorPlanA4Preview'));
    expect(source).toContain('data-ceremony-preview-region="true"');
    expect(source.match(/const ceremonyA4Ref = useRef/g)).toHaveLength(1);
    expect(source).toContain('pageElement: ceremonyA4Ref.current');
    expect(source).toContain('pageRef={ceremonyA4Ref}');
    expect(source).toContain("pageElement.dataset.ceremonyPrintSource = 'true'");
    expect(source).not.toMatch(/<CeremonyFloorPlanA4Preview\s+key=/);
    expect(source).not.toContain('lg:grid-cols-5');
    expect(source).toContain("await import('@/lib/ceremonyFloorPlanPdfExporter')");
    expect(source).not.toContain("import { exportCeremonyPreviewToPdf } from '@/lib/ceremonyFloorPlanPdfExporter'");
  });

  it('keeps the management controls in one compact responsive row and moves attendance into settings', () => {
    const page = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.tsx'), 'utf8');
    const pageCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.module.css'), 'utf8');
    const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanSettings.tsx'), 'utf8');
    const settingsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanSettings.module.css'), 'utf8');

    expect(page.match(/data-floor-plan-controls-row=/g)).toHaveLength(1);
    expect(page.match(/data-floor-plan-export-controls=/g)).toHaveLength(1);
    expect(page.indexOf('Choose Event:')).toBeLessThan(page.indexOf('Floor Plan Type:'));
    expect(page.indexOf('Floor Plan Type:')).toBeLessThan(page.indexOf('Export Controls'));
    expect(page).not.toContain('rounded-xl p-3 sm:p-4');
    expect(page).toContain('styles.exportControls');
    expect(pageCss).toMatch(/\.exportControls \{[\s\S]*?border: 1px solid var\(--ceremony-champagne-border\);[\s\S]*?border-radius: \.75rem;/);
    expect(page).toContain('aria-describedby="floor-plan-export-description"');
    expect(page).toContain('totalAttending={totalAttending}');
    expect(settings).toContain('Total Attending: <strong>{totalAttending}</strong>');
    expect(settings).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(settingsCss).toMatch(/@media \(min-width: 768px\)[\s\S]*?\.settingsHeader \{ flex-direction: row/);
  });

  it('keeps settings outside the authoritative printable renderer and PDF exporter', () => {
    const a4 = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.tsx'), 'utf8');
    const exporter = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/ceremonyFloorPlanPdfExporter.ts'), 'utf8');
    expect(a4).not.toContain('CeremonyFloorPlanSettings');
    expect(a4).not.toContain('Layout Settings');
    expect(exporter).not.toContain('CeremonyFloorPlanSettings');
    expect(exporter).not.toContain('Layout Settings');
  });

  it('prints the referenced A4 while changing only its external presentation wrappers', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.module.css'), 'utf8');
    const printRules = css.slice(css.indexOf('@page ceremony-floor-plan'));

    expect(printRules).toContain('@page ceremony-floor-plan { size: A4 landscape; margin: 0; }');
    expect(printRules).toContain('[data-ceremony-print-source="true"]');
    expect(printRules).toMatch(/\.previewSheet[\s\S]*?transform: none !important/);
    expect(printRules).not.toMatch(/\.sheet\s*\{[^}]*?(font-size|line-height|width|height|padding|margin|gap|transform|overflow)/);
  });

  it('uses the canonical glossy asset for both modes and keeps each A4 stage free-standing', () => {
    const page = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.tsx'), 'utf8');
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.module.css'), 'utf8');
    const shellRule = css.match(/:global\(main\[data-dashboard-content\]:has\(\[data-floor-plan-mode="ceremony"\]\)\) \{([\s\S]*?)\}/)?.[1] ?? '';
    const previewRule = css.match(/\.previewRegion,\s*\.previewRegion > \* \{([\s\S]*?)\}/)?.[1] ?? '';

    expect(page).toContain("floorPlanType === 'ceremony' ? ` ${styles.ceremonyPage}` : ` ${receptionStyles.receptionPage}`");
    expect(page).toContain('data-floor-plan-mode={floorPlanType}');
    expect(shellRule).toContain('min-height: 100dvh');
    expect(shellRule).not.toContain('dashboard-mocha-liquid-glass.png');
    expect(shellRule).not.toContain('background-size');
    expect(shellRule).not.toContain('gradient');
    expect(previewRule).toContain('background: transparent');
    expect(previewRule).toContain('border: 0');
    expect(previewRule).toContain('padding: 0');
    expect(previewRule).toContain('box-shadow: none');
  });

  it('scopes the espresso foreground to Ceremony while retaining the existing layout and controls', () => {
    const page = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.tsx'), 'utf8');
    const pageCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.module.css'), 'utf8');
    const settingsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanSettings.module.css'), 'utf8');

    expect(page).toContain("floorPlanType === 'ceremony' ? styles.headerPanel : receptionStyles.headerPanel");
    expect(page).toContain("floorPlanType === 'ceremony' ? styles.control : receptionStyles.control");
    expect(page).toContain("floorPlanType === 'ceremony' ? styles.portalSurface : receptionStyles.portalSurface");
    expect(pageCss).toContain('--ceremony-champagne-border: rgba(239, 220, 196, 0.72)');
    expect(pageCss).toContain('border-color: #22c55e !important');
    expect(settingsCss).toContain(".selector[data-active='true']");
    expect(settingsCss).toContain('[role="switch"][data-state="checked"]');
    expect(settingsCss).toContain('background: #22c55e !important');
    expect(settingsCss).toContain('.portalSurface');
    expect(page).toContain('headerControlsContainer={receptionHeaderControlsContainer}');
  });

  it('places Reception reset and export controls in the shared header without duplicating their handlers', () => {
    const shell = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/FloorPlanPage.tsx'), 'utf8');
    const reception = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanPage.tsx'), 'utf8');
    const canvas = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas.tsx'), 'utf8');

    expect(shell.match(/data-reception-header-controls=/g)).toHaveLength(1);
    expect(shell.indexOf('Choose Event:')).toBeLessThan(shell.indexOf('Floor Plan Type:'));
    expect(reception.match(/Reset layout/g)).toBeNull();
    expect(canvas.match(/Reset layout/g)).toHaveLength(1);
    expect(canvas).toContain('onClick={onResetRequest}');
    expect(reception.match(/Export Controls/g)).toHaveLength(1);
    expect(reception).toContain("exporting ? 'Exporting...' : 'Download PDF'");
    expect(reception).toContain('onResetRequest={() => setResetOpen(true)}');
    expect(reception).toContain("onClick={() => handleExport('a4')}");
    expect(reception).toContain('createPortal(headerControls, headerControlsContainer)');
    expect(reception).not.toContain("'Export PDF'");
  });
});
