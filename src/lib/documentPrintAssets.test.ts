import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
const paths=[
'components/Dashboard/EventBudgetPlanner/EventBudgetPrintDocument.tsx',
'components/Dashboard/FullSeatingChart/FullSeatingChartExporter.tsx',
'components/Dashboard/FullSeatingChart/FullSeatingChartPrintTemplate.tsx',
'components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx',
'components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.tsx',
'components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanA4.tsx',
'components/Dashboard/IndividualTableChart/IndividualTableChartPrintPage.tsx',
'components/Dashboard/TableChart/TableChartPreview.tsx',
'components/Dashboard/QRCode/KitchenDietaryChart.tsx',
'pages/RunningSheetPublicView.tsx','pages/DJMCPublicView.tsx',
'lib/djMCQuestionnairePdfExporter.ts','lib/runningSheetPdfExporter.ts',
'lib/fullSeatingChartPdfExporter.ts','lib/individualTableChartEngine.ts',
'lib/tableChartEngine.ts','lib/tablesDocument.ts'];
it.each(paths)('uses the bounded print logo in %s',path=>{const source=readFileSync('src/'+path,'utf8');expect(source).toContain('/wedding-waitress-document-footer-print.png');expect(source).not.toContain('/wedding-waitress-document-footer-dark-brown.png')});
it('keeps the optimized print logo small to decode with sufficient resolution for document footers',()=>{const png=readFileSync('public/wedding-waitress-document-footer-print.png');expect(png.readUInt32BE(16)).toBe(2560);expect(png.readUInt32BE(20)).toBe(618);expect(png.length).toBeLessThan(400000)});
it.each(['lib/placeCardsPdfExporter.ts','lib/invitationPreviewPdfExporter.ts','lib/signagePdfExporter.ts'])('does not introduce the oversized footer into artwork-only export %s',path=>{expect(readFileSync('src/'+path,'utf8')).not.toContain('/wedding-waitress-document-footer-dark-brown.png')});

