import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ html2canvas: vi.fn(), pdfConstructor: vi.fn(), addImage: vi.fn(), addPage: vi.fn(), savePdfAsync: vi.fn() }));
vi.mock('html2canvas', () => ({ default: mocks.html2canvas }));
vi.mock('jspdf', () => ({ default: class MockJsPdf { addImage = mocks.addImage; addPage = mocks.addPage; constructor(options: unknown) { mocks.pdfConstructor(options); } } }));
vi.mock('@/lib/pdfExportUtils', () => ({ PDF_DEFAULT_OPTIONS: { compress: true }, savePdfAsync: mocks.savePdfAsync }));

import { createEventBudgetPdf, exportEventBudgetPdf, prepareEventBudgetPdfClone } from './eventBudgetPdfExporter';

const makeRoot = (count: number) => {
  const root = document.createElement('div');
  for (let index = 0; index < count; index += 1) {
    const presentation = document.createElement('div'); presentation.dataset.printMirrorPresentation = 'true'; presentation.style.boxShadow = '0 1px 2px black';
    const page = document.createElement('article'); page.dataset.printMirrorDocument = 'event-budget';
    Object.defineProperties(page, { offsetWidth: { value: 1123 }, offsetHeight: { value: 794 } });
    presentation.appendChild(page); root.appendChild(presentation);
  }
  return root;
};

describe('Event Budget PDF exporter', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.html2canvas.mockResolvedValue({ toDataURL: () => 'data:image/png;base64,budget' }); mocks.savePdfAsync.mockResolvedValue(undefined); });

  it('captures every page from the authoritative renderer into A4 landscape PDF pages', async () => {
    const root = makeRoot(2);
    await createEventBudgetPdf(root);
    expect(mocks.html2canvas).toHaveBeenCalledTimes(2);
    expect(mocks.pdfConstructor).toHaveBeenCalledWith(expect.objectContaining({ orientation: 'landscape', unit: 'mm', format: 'a4' }));
    expect(mocks.addPage).toHaveBeenCalledTimes(1);
    expect(mocks.addImage).toHaveBeenCalledTimes(2);
    expect(mocks.addImage).toHaveBeenLastCalledWith('data:image/png;base64,budget', 'PNG', 0, 0, 297, 210, undefined, 'FAST');
  });

  it('uses the same renderer for download and changes only external presentation styles in clones', async () => {
    const root = makeRoot(1);
    await exportEventBudgetPdf(root, 'Awards / Night');
    expect(mocks.savePdfAsync).toHaveBeenCalledWith(expect.anything(), 'Awards  Night-Event-Budget-Planner.pdf');
    const clonedDocument = document.implementation.createHTMLDocument(); clonedDocument.body.appendChild(root.cloneNode(true));
    prepareEventBudgetPdfClone(clonedDocument);
    const presentation = clonedDocument.querySelector<HTMLElement>('[data-print-mirror-presentation="true"]')!;
    expect(presentation.style.boxShadow).toBe('none'); expect(presentation.style.border).toBe('0px'); expect(presentation.style.transform).toBe('none');
  });
});
