import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  getReceptionRoomFit,
  ReceptionFloorPlanA4,
  RECEPTION_A4,
} from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { A4_MM } from './a4';
import {
  PRINT_PDF_MIRROR_DECLARATIONS,
  RECEPTION_PRINT_MIRROR_CONTRACT,
} from './printPdfMirrorContract';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

const plan = {
  room_width_m: 15,
  room_length_m: 20,
  grid_size_cm: 50,
  table_positions: [{ table_id: 'table-1', x: 14.5, y: 19.5, rotation: 45, locked: true }],
  fixtures: [{ id: 'fixture-1', type: 'stage', x: 0.5, y: 0.5, width_m: 1, height_m: 1, rotation: 90, locked: true }],
  background: { path: null, x: 0, y: 0, width: null, height: null, rotation: 0, opacity: 1, visible: true, locked: false },
  room_polygon: null,
} as unknown as ReceptionFloorPlan;

describe('Reception Floor Plan authoritative A4 architecture', () => {
  it('defines one exact ISO A4 landscape coordinate system', () => {
    expect(A4_MM).toEqual({ width: 210, height: 297 });
    expect(RECEPTION_A4.widthMm).toBe(297);
    expect(RECEPTION_A4.heightMm).toBe(210);
    expect(RECEPTION_PRINT_MIRROR_CONTRACT).toEqual({
      id: 'reception-floor-plan',
      selector: '[data-print-mirror-document="reception-floor-plan"]',
      widthMm: 297,
      heightMm: 210,
      orientation: 'landscape',
    });
  });

  it('renders one clean fixed paper while preserving source plan coordinates', () => {
    const originalCoordinates = JSON.stringify({
      tables: plan.table_positions,
      fixtures: plan.fixtures,
      polygon: plan.room_polygon,
    });
    const markup = renderToStaticMarkup(
      <ReceptionFloorPlanA4
        pageRef={{ current: null }}
        event={{ name: 'Jason & Linda’s Wedding', date: '2026-12-20', venue: 'Sheldon Receptions' }}
        plan={plan}
        attendingCount={167}
        generatedAt={new Date('2026-08-20T00:00:00Z')}
        roomWidthPx={1000}
        roomHeightPx={750}
      >
        <div data-test-room="true" />
      </ReceptionFloorPlanA4>,
    );

    expect(markup).toContain('data-reception-a4-renderer="true"');
    expect(markup).toContain('data-print-mirror-orientation="landscape"');
    expect(markup).toContain('data-print-mirror-width-mm="297"');
    expect(markup).toContain('data-print-mirror-height-mm="210"');
    expect(markup).toContain('data-reception-fit-strategy="maximum-proportional-contain"');
    expect(markup).toContain('data-transformed-drawing-width-px="1000"');
    expect(markup).toContain('data-transformed-drawing-height-px="750"');
    expect(markup).toContain('data-test-room="true"');
    expect(JSON.stringify({ tables: plan.table_positions, fixtures: plan.fixtures, polygon: plan.room_polygon })).toBe(originalCoordinates);
  });

  it('uses the maximum proportional landscape fit for the populated 15 x 20 m room', () => {
    const portraitFit = getReceptionRoomFit(750, 1000);
    const landscapeFit = getReceptionRoomFit(1000, 750);
    const expectedScale = Math.min(
      RECEPTION_A4.printableWidthPx / 1004,
      RECEPTION_A4.printableHeightPx / 754,
    );

    expect(landscapeFit.scale).toBeCloseTo(expectedScale, 12);
    expect(landscapeFit.width).toBeGreaterThan(portraitFit.width * 1.7);
    expect(landscapeFit.height).toBeLessThanOrEqual(RECEPTION_A4.printableHeightPx + 0.001);
    expect(landscapeFit.width / landscapeFit.height).toBeCloseTo(1004 / 754, 10);
  });

  it.each([
    [100, 250],
    [750, 1000],
    [2500, 100],
    [100, 2500],
    [2500, 2500],
  ])('fits a %s × %s room inside printable bounds without distortion', (width, height) => {
    const fit = getReceptionRoomFit(width, height);
    expect(fit.width).toBeLessThanOrEqual(RECEPTION_A4.printableWidthPx + 0.001);
    expect(fit.height).toBeLessThanOrEqual(RECEPTION_A4.printableHeightPx + 0.001);
    expect(fit.width / fit.height).toBeCloseTo((width + 4) / (height + 4), 10);
    expect(fit.scale).toBeCloseTo(Math.min(
      RECEPTION_A4.printableWidthPx / (width + 4),
      RECEPTION_A4.printableHeightPx / (height + 4),
    ), 12);
  });

  it('uses one visible renderer, one ref, and no reconstructed PDF geometry', () => {
    const page = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanPage.tsx');
    const canvas = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas.tsx');
    const renderer = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4.tsx');
    const css = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4.module.css');
    const exporter = read('src/lib/receptionFloorPlanPdfExporter.ts');

    expect(canvas.match(/<ReceptionFloorPlanA4Preview/g)).toHaveLength(1);
    expect(renderer.match(/<ReceptionFloorPlanA4 pageRef={pageRef}/g)).toHaveLength(1);
    expect(page.match(/const receptionA4Ref = useRef/g)).toHaveLength(1);
    expect(page).toContain('a4Ref={receptionA4Ref}');
    expect(page).toContain('pageElement: receptionA4Ref.current');
    expect(css).toContain('width: 297mm');
    expect(css).toContain('height: 210mm');
    expect(css).toContain('padding: 4mm 5mm');
    expect(css).toContain('@page reception-floor-plan { size: A4 landscape; margin: 0; }');
    expect(css).toContain('background: transparent');
    expect(css).not.toMatch(/\.previewViewport[^}]*background:\s*(#|rgb|linear-gradient)/s);
    expect(exporter).toContain('assertAuthoritativeMirrorDocument(pageElement, RECEPTION_PRINT_MIRROR_CONTRACT)');
    expect(exporter).toContain('html2canvas(pageElement');
    expect(exporter).toContain("orientation: 'landscape'");
    expect(exporter).toContain('A4_MM.height');
    expect(exporter).toContain('A4_MM.width');
    expect(exporter).not.toMatch(/draw(Room|Table|Fixture|Legend|Header|Footer)/);
    expect(exporter).not.toContain('addPage');
    expect(page).not.toContain('Reception PDF export options');
    expect(page).not.toContain('A4 landscape (297 × 210mm)');
    expect(page.match(/onClick=\{\(\) => handleExport\('a4'\)\}/g)).toHaveLength(1);
  });

  it('declares Reception compliant and keeps responsive behaviour outside the paper', () => {
    const declaration = PRINT_PDF_MIRROR_DECLARATIONS.find((item) => item.id === 'reception-floor-plan');
    const css = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4.module.css');
    expect(declaration?.status).toBe('compliant');
    expect(declaration?.authoritativeRenderer).toBe('ReceptionFloorPlanA4');
    expect(css).toContain('.previewSheet');
    expect(css).toContain('transform-origin: top left');
    expect(css).toContain('overflow: auto hidden');
    expect(css).not.toMatch(/@media[^}]+\.sheet\s*{/s);
  });

  it('retains Reception editing interactions through the scaled A4 coordinate layer', () => {
    const canvas = read('src/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas.tsx');
    const exporter = read('src/lib/receptionFloorPlanPdfExporter.ts');

    expect(canvas).toContain('handleTableDragStart');
    expect(canvas).toContain('handleFixtureDragStart');
    expect(canvas).toContain('handleCanvasDrop');
    expect(canvas).toContain('handlePointerDown');
    expect(canvas).toContain('handlePointerMove');
    expect(canvas).toContain('rotateTable');
    expect(canvas).toContain('rotateFixture');
    expect(canvas).toContain('toggleLockTable');
    expect(canvas).toContain('toggleLockFixture');
    expect(canvas).toContain('removeTable');
    expect(canvas).toContain('removeFixture');
    expect(canvas).toContain('receptionRoomPolygonToLandscape(plan.room_polygon.points, roomPresentation)');
    expect(canvas).toContain('data-reception-landscape-presentation="true"');
    expect(canvas).toContain('data-reception-upright-label="table"');
    expect(canvas).toContain('data-reception-upright-label="fixture"');
    expect(canvas).toContain('data-reception-upright-background-frame="true"');
    expect(canvas).toContain("transform: 'translate(-50%, -50%) rotate(-90deg)'");
    expect(canvas).toContain('clientPointToReceptionRoom(');
    expect(canvas).toContain('roomPresentation,');
    expect(canvas).not.toMatch(/data-reception-room-canvas[\s\S]{0,600}rotate\((?:90|-90)deg\)/);
    expect(canvas).toContain('calculateReceptionCanvasMetrics');
    expect(canvas).toContain('clientPointToReceptionRoom');
    expect(canvas.match(/data-reception-screen-only="true"/g)).toHaveLength(5);
    expect(canvas).toContain('data-reception-fixture-resize-handle={handle}');
    expect(exporter).toContain(".querySelectorAll<HTMLElement>('[data-reception-screen-only=\"true\"]')");
  });
});
