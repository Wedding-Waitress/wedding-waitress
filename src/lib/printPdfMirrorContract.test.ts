import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertAuthoritativeMirrorDocument,
  CEREMONY_PRINT_MIRROR_CONTRACT,
  MIRROR_PRESENTATION_STYLE_PROPERTIES,
  preparePrintMirrorClone,
  PRINT_PDF_MIRROR_DECLARATIONS,
} from './printPdfMirrorContract';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Preview–Print–PDF mirror contract', () => {
  it('declares every audited Wedding Waitress printable and makes violations explicit', () => {
    const ids = PRINT_PDF_MIRROR_DECLARATIONS.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      'ceremony-floor-plan', 'reception-floor-plan', 'dietary-requirements',
      'individual-table-charts', 'full-seating-chart', 'seating-chart-signs',
      'invitations-cards', 'name-place-cards', 'running-sheet', 'dj-mc-questionnaire',
    ]));
    for (const declaration of PRINT_PDF_MIRROR_DECLARATIONS) {
      expect(declaration.authoritativeRenderer).not.toBe('');
      expect(declaration.documentReference).not.toBe('');
      expect(declaration.intrinsicPaper).not.toBe('');
      expect(declaration.captureSource).not.toBe('');
      expect(declaration.pdfPageSize).not.toBe('');
      expect(declaration.auditNote).not.toBe('');
    }
    expect(PRINT_PDF_MIRROR_DECLARATIONS.find(item => item.id === 'ceremony-floor-plan')?.status).toBe('compliant');
    expect(PRINT_PDF_MIRROR_DECLARATIONS.find(item => item.id === 'individual-table-charts')?.status).toBe('compliant');
    expect(PRINT_PDF_MIRROR_DECLARATIONS.find(item => item.id === 'dietary-requirements')?.status).toBe('protected-exception');
  });

  it('rejects the wrong reference or responsive geometry before export', () => {
    const wrong = document.createElement('div');
    expect(() => assertAuthoritativeMirrorDocument(wrong, CEREMONY_PRINT_MIRROR_CONTRACT)).toThrow(/authoritative/);

    const reflowed = document.createElement('div');
    reflowed.dataset.printMirrorDocument = 'ceremony-floor-plan';
    Object.defineProperties(reflowed, { offsetWidth: { value: 700 }, offsetHeight: { value: 500 } });
    expect(() => assertAuthoritativeMirrorDocument(reflowed, CEREMONY_PRINT_MIRROR_CONTRACT)).toThrow(/297 × 210 mm/);
  });

  it('neutralises only the external presentation wrapper and never edits document geometry', () => {
    const documentElement = document.createElement('article');
    documentElement.dataset.printMirrorDocument = 'ceremony-floor-plan';
    documentElement.style.cssText = 'width:297mm;height:210mm;font-size:8pt;line-height:1.35;gap:2mm;overflow:hidden';
    const originalDocumentStyles = documentElement.style.cssText;
    const wrapper = document.createElement('div');
    wrapper.dataset.printMirrorPresentation = 'true';
    wrapper.style.cssText = 'transform:scale(.6);transform-origin:top left;border:1px solid red;box-shadow:0 4px 20px black';
    wrapper.appendChild(documentElement);
    const clonedDocument = document.implementation.createHTMLDocument();
    clonedDocument.body.appendChild(wrapper);

    preparePrintMirrorClone(clonedDocument, CEREMONY_PRINT_MIRROR_CONTRACT);

    expect(documentElement.style.cssText).toBe(originalDocumentStyles);
    expect(wrapper.style.transform).toBe('none');
    expect(wrapper.style.border).toBe('0px');
    expect(wrapper.style.boxShadow).toBe('none');
    expect(MIRROR_PRESENTATION_STYLE_PROPERTIES).toEqual(['transform', 'transform-origin', 'border', 'box-shadow']);
  });

  it('keeps Ceremony on one mounted renderer, one reference, and viewport-independent A4 CSS', () => {
    const page = read('src/components/Dashboard/FloorPlan/FloorPlanPage.tsx');
    const renderer = read('src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.tsx');
    const css = read('src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanA4.module.css');
    const exporter = read('src/lib/ceremonyFloorPlanPdfExporter.ts');

    expect(page.match(/<CeremonyFloorPlanA4Preview/g)).toHaveLength(1);
    expect(page).toContain('pageElement: ceremonyA4Ref.current');
    expect(page).toContain('pageRef={ceremonyA4Ref}');
    expect(page).toContain("pageElement.dataset.ceremonyPrintSource = 'true'");
    expect(renderer.match(/<CeremonyFloorPlanA4 ref={pageRef}/g)).toHaveLength(1);
    expect(renderer).toContain('data-print-mirror-document="ceremony-floor-plan"');
    expect(renderer).toContain('data-print-mirror-presentation="true"');
    expect(css).toContain('width: 297mm');
    expect(css).toContain('height: 210mm');
    expect(css.match(/@media/g)).toHaveLength(1);
    expect(css).toContain('@media print');
    expect(exporter).toContain('assertAuthoritativeMirrorDocument(pageElement, CEREMONY_PRINT_MIRROR_CONTRACT)');
    expect(exporter).toContain('preparePrintMirrorClone(clonedDocument, CEREMONY_PRINT_MIRROR_CONTRACT)');
    expect(exporter).not.toMatch(/clonedPage\.style\.(width|height|fontSize|lineHeight|padding|margin|gap|overflow|display|position)/);
  });
});
