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
vi.mock('@/lib/pdfExportUtils', () => ({ PDF_DEFAULT_OPTIONS: { compress: true }, savePdfAsync: mocks.savePdfAsync }));

import { exportCeremonyPreviewToPdf, prepareCeremonyPdfClone } from './ceremonyFloorPlanPdfExporter';

describe('Ceremony preview PDF exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.html2canvas.mockResolvedValue({ toDataURL: () => 'data:image/png;base64,ceremony' });
    mocks.savePdfAsync.mockResolvedValue(undefined);
  });

  it('captures the shared renderer once into one 297 x 210 mm A4 landscape page', async () => {
    const page = document.createElement('div');
    page.dataset.ceremonyA4Renderer = 'true';
    page.dataset.printMirrorDocument = 'ceremony-floor-plan';
    Object.defineProperties(page, { offsetWidth: { value: 1123 }, offsetHeight: { value: 794 } });

    await exportCeremonyPreviewToPdf({ pageElement: page, eventName: 'Jason & Linda', eventDate: '2026-12-20' });

    expect(mocks.html2canvas).toHaveBeenCalledTimes(1);
    expect(mocks.html2canvas).toHaveBeenCalledWith(page, expect.objectContaining({ width: 1123, height: 794, scale: 3 }));
    expect(mocks.pdfConstructor).toHaveBeenCalledWith(expect.objectContaining({ orientation: 'landscape', unit: 'mm', format: 'a4' }));
    expect(mocks.addImage).toHaveBeenCalledWith('data:image/png;base64,ceremony', 'PNG', 0, 0, 297, 210, undefined, 'FAST');
    expect(mocks.addPage).not.toHaveBeenCalled();
    expect(mocks.savePdfAsync).toHaveBeenCalledWith(expect.anything(), 'Jason & Linda-Ceremony-Floor Plan-20-12-2026.pdf');
  });

  it('keeps page wiring on the visible renderer with no duplicate PDF markup', async () => {
    const pageSource = await import('node:fs/promises').then(fs => fs.readFile('src/components/Dashboard/FloorPlan/FloorPlanPage.tsx', 'utf8'));
    const exporterSource = await import('node:fs/promises').then(fs => fs.readFile('src/lib/ceremonyFloorPlanPdfExporter.ts', 'utf8'));
    expect(pageSource.match(/<CeremonyFloorPlanA4Preview/g)).toHaveLength(1);
    expect(pageSource).toContain('pageElement: ceremonyA4Ref.current');
    expect(exporterSource).toContain('await html2canvas(pageElement');
    expect(exporterSource).not.toContain('seat_assignments');
    expect(exporterSource).not.toContain('roundedRect');
  });

  it('changes only preview presentation styles in the export clone', () => {
    const livePage = document.createElement('div');
    livePage.dataset.ceremonyA4Renderer = 'true';
    livePage.dataset.printMirrorDocument = 'ceremony-floor-plan';
    livePage.style.transform = 'scale(.75)';
    livePage.innerHTML = `
      <header data-ceremony-a4-header="true">
        <h1>Jason &amp; Linda's Wedding</h1>
        <h2>Ceremony Floor Plan</h2>
        <div>Ceremony details</div><div>Total Attending</div><div class="separator"></div>
      </header>
      <main>
        <section data-ceremony-party="left"><h3>Groomsmen (10)</h3></section>
        <div><div title="NADER">NADER</div><div>Celebrant</div><div title="NAHLA">NAHLA</div></div>
        <section data-ceremony-party="right">
          <h3>Bridesmaids (10)</h3>
          <div data-ceremony-party-seat="right-0"><span>Samantha</span></div>
          <div data-ceremony-role="Maid of Honor">Maid of Honor</div>
        </section>
        <section data-ceremony-family="left"><h3>Groom's Family (72)</h3>
          <span data-row-number="true">1</span><div data-ceremony-seat="left-1-1"><span>Grandma</span></div>
        </section>
        <div data-ceremony-aisle="true"><span style="writing-mode:vertical-rl;transform:rotate(180deg)">Bride's Walkway â€“ Aisle</span></div>
        <section data-ceremony-family="right"><h3>Bride's Family (72)</h3></section>
      </main>
      <footer data-ceremony-a4-footer="true">Untouched footer</footer>`;
    const liveParent = document.createElement('div');
    liveParent.dataset.printMirrorPresentation = 'true';
    liveParent.style.transform = 'scale(.75)';
    liveParent.appendChild(livePage);
    const clone = liveParent.cloneNode(true) as HTMLElement;
    const clonedDocument = document.implementation.createHTMLDocument();
    clonedDocument.body.appendChild(clone);

    prepareCeremonyPdfClone(clonedDocument);

    const clonedPage = clone.querySelector<HTMLElement>('[data-ceremony-a4-renderer="true"]')!;
    expect(livePage.querySelectorAll('[data-ceremony-pdf-text-group]')).toHaveLength(0);
    expect(livePage.querySelector('h1')?.textContent).toBe("Jason & Linda's Wedding");
    expect(livePage.style.transform).toBe('scale(.75)');
    expect(clonedPage.style.transform).toBe('scale(.75)');
    expect(clone.style.transform).toBe('none');
    expect(clonedPage.style.border).toBe('');
    expect(clonedPage.style.boxShadow).toBe('');
    expect(clonedPage.querySelectorAll('[data-ceremony-pdf-text-group]')).toHaveLength(0);
    expect(clonedPage.querySelector('h1')?.children).toHaveLength(0);
    expect(clonedPage.querySelector('[data-ceremony-role]')?.textContent).toBe('Maid of Honor');
    expect(clonedPage.querySelector('[data-ceremony-seat]')?.textContent).toBe('Grandma');
    const aisle = clonedPage.querySelector<HTMLElement>('[data-ceremony-aisle] > span')!;
    expect(aisle.style.writingMode).toBe('vertical-rl');
    expect(aisle.style.transform).toBe('rotate(180deg)');
    expect(clonedPage.querySelector('[data-ceremony-a4-footer]')?.textContent).toBe('Untouched footer');
  });
});
