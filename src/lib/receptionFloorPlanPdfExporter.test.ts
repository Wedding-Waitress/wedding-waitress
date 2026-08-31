import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  html2canvas: vi.fn(),
  pdfConstructor: vi.fn(),
  addImage: vi.fn(),
  addPage: vi.fn(),
  savePdfAsync: vi.fn(),
}));

vi.mock('html2canvas', () => ({ default: mocks.html2canvas }));
vi.mock('jspdf', () => ({
  default: class MockJsPdf {
    addImage = mocks.addImage;
    addPage = mocks.addPage;
    constructor(options: unknown) { mocks.pdfConstructor(options); }
  },
}));
vi.mock('@/lib/pdfExportUtils', () => ({
  PDF_DEFAULT_OPTIONS: { compress: true },
  savePdfAsync: mocks.savePdfAsync,
}));

import {
  exportReceptionPreviewToPdf,
  prepareReceptionPdfClone,
} from './receptionFloorPlanPdfExporter';

describe('Reception preview PDF exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.html2canvas.mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,reception',
    });
    mocks.savePdfAsync.mockResolvedValue(undefined);
  });

  it('captures the shared renderer once into one 297 x 210 mm A4 landscape page', async () => {
    const page = document.createElement('div');
    page.dataset.receptionA4Renderer = 'true';
    page.dataset.printMirrorDocument = 'reception-floor-plan';
    Object.defineProperties(page, {
      offsetWidth: { value: 1123 },
      offsetHeight: { value: 794 },
    });

    await exportReceptionPreviewToPdf({
      pageElement: page,
      eventName: 'Jason & Linda',
      eventDate: '2026-12-20',
    });

    expect(mocks.html2canvas).toHaveBeenCalledTimes(1);
    expect(mocks.html2canvas).toHaveBeenCalledWith(
      page,
      expect.objectContaining({ width: 1123, height: 794, scale: 3 }),
    );
    expect(mocks.pdfConstructor).toHaveBeenCalledWith(expect.objectContaining({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    }));
    expect(mocks.addImage).toHaveBeenCalledWith(
      'data:image/png;base64,reception',
      'PNG',
      0,
      0,
      297,
      210,
      undefined,
      'FAST',
    );
    expect(mocks.addPage).not.toHaveBeenCalled();
  });

  it('removes only screen controls and external preview presentation from the clone', () => {
    const documentClone = document.implementation.createHTMLDocument();
    documentClone.body.innerHTML = `
      <div data-print-mirror-presentation="true" style="transform:scale(.7);box-shadow:1px 1px 2px #000">
        <div data-print-mirror-document="reception-floor-plan">
          <div data-reception-a4-header="true">Header</div>
          <button data-reception-screen-only="true">Rotate</button>
          <div data-reception-a4-room-stage="true">Room</div>
          <div data-reception-a4-footer="true">Footer</div>
        </div>
      </div>`;

    prepareReceptionPdfClone(documentClone);

    const presentation = documentClone.querySelector<HTMLElement>('[data-print-mirror-presentation]')!;
    expect(presentation.style.transform).toBe('none');
    expect(presentation.style.boxShadow).toBe('none');
    expect(documentClone.querySelector('[data-reception-screen-only]')).toBeNull();
    expect(documentClone.querySelector('[data-reception-a4-header]')?.textContent).toBe('Header');
    expect(documentClone.querySelector('[data-reception-a4-room-stage]')?.textContent).toBe('Room');
    expect(documentClone.querySelector('[data-reception-a4-footer]')?.textContent).toBe('Footer');
  });
});
