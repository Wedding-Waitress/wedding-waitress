import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

const approvedLayers = [
  '#120806 0%',
  '#170a07 12%',
  '#25110b 31%',
  '#351b12 50%',
  '#28130d 69%',
  '#180b08 88%',
  '#120806 100%',
];

describe('shared Wedding Waitress application background', () => {
  const indexCss = read('src/index.css');

  it('owns the universal flare-free espresso background once', () => {
    expect(indexCss.match(/--ww-application-background-color:/g)).toHaveLength(1);
    expect(indexCss.match(/--ww-application-background-image:/g)).toHaveLength(1);
    expect(indexCss).toContain('--ww-application-background-color: #120806');
    expect(indexCss).toContain('--ww-application-background-image: linear-gradient(');
    expect(indexCss).toContain('180deg');
    approvedLayers.forEach(layer => expect(indexCss).toContain(layer));
    expect(indexCss).not.toContain('rgba(255, 111, 24, 0.62)');
    expect(indexCss).not.toContain('linear-gradient(116deg');
    expect(indexCss).toMatch(/\.ww-application-background\s*\{[\s\S]*min-height:\s*100dvh[\s\S]*background-color:\s*var\(--ww-application-background-color\) !important[\s\S]*background-image:\s*var\(--ww-application-background-image\) !important[\s\S]*background-repeat:\s*var\(--ww-application-background-repeat\) !important[\s\S]*background-size:\s*var\(--ww-application-background-size\) !important/);
  });

  it('uses the darkest espresso fallback for the document and route transitions', () => {
    const app = read('src/App.tsx');
    expect(indexCss).toMatch(/html, body, #root\s*\{[\s\S]*min-height:\s*100dvh[\s\S]*background-color:\s*var\(--ww-application-background-color\) !important/);
    expect(app).toContain('ww-application-background min-h-screen w-full animate-pulse');
    expect(indexCss).toMatch(/@media print\s*\{[\s\S]*html, body\s*\{[\s\S]*background:\s*#fff !important/);
  });

  it('covers every authenticated dashboard tab through the shared shell and main canvas', () => {
    const dashboard = read('src/pages/Dashboard.tsx');
    expect(dashboard).toContain('data-dashboard-shell className={`dashboard-shell ww-application-background');
    expect(dashboard).toContain('<main data-dashboard-content className={`ww-application-background');

    const legacyDashboardSurfaces = [
      'src/components/Dashboard/DashboardOverview.module.css',
      'src/components/Dashboard/MyEventsPage.module.css',
      'src/pages/TablesPage.module.css',
      'src/components/Dashboard/GuestListTable.module.css',
      'src/components/Dashboard/QRCode/QRCodeSeatingChart.module.css',
      'src/components/Dashboard/Signage/SignagePage.module.css',
      'src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.module.css',
      'src/components/Dashboard/Kiosk/KioskSetup.module.css',
      'src/components/Dashboard/FloorPlan/FloorPlanPage.module.css',
      'src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanTheme.module.css',
      'src/components/Dashboard/RunningSheet/RunningSheetTheme.module.css',
      'src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireTheme.module.css',
    ];
    legacyDashboardSurfaces.forEach(file => {
      expect(read(file), file).not.toContain('dashboard-mocha-liquid-glass.png');
    });
  });

  it('applies the primitive to account, admin and non-branded shared application shells', () => {
    const routeShells = [
      ['src/pages/Account.tsx', 'ww-application-background'],
      ['src/pages/Admin.tsx', 'ww-application-background'],
      ['src/pages/AccountRecovery.tsx', 'ww-application-background'],
      ['src/pages/RunningSheetPublicView.tsx', 'ww-application-background'],
      ['src/pages/DJMCPublicView.tsx', 'ww-application-background'],
      ['src/pages/GuestLookup.tsx', 'ww-application-background'],
      ['src/pages/KioskView.tsx', 'ww-application-background'],
      ['src/pages/SeatingChartPublicView.tsx', 'ww-application-background'],
      ['src/pages/ReceptionFloorPlanShareView.tsx', 'ww-application-background'],
    ] as const;
    routeShells.forEach(([file, token]) => expect(read(file), file).toContain(token));
  });
});
