import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ getDocument: state.getDocument }));
vi.mock('./pdfFirstPageToPng', () => ({}));
import { openPdfPrintWindow, openPdfPrintFrame } from './pdfPrint';

describe('PDF print delivery', () => {
  let preview: Window;
  let pdf: { numPages: number; getPage: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  const blob = { arrayBuffer: async () => new ArrayBuffer(1) } as Blob;
  beforeEach(() => {
    state.getDocument.mockReset();
    preview = { document: document.implementation.createHTMLDocument(), closed: false, close: vi.fn(), focus: vi.fn(), print: vi.fn(), addEventListener: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(preview);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,fixture');
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn(async () => {}) });
    pdf = { numPages: 2, getPage: vi.fn(async () => ({ getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }), render: () => ({ promise: Promise.resolve() }), cleanup: vi.fn() })), destroy: vi.fn(async () => {}) };
    state.getDocument.mockReturnValue({ promise: Promise.resolve(pdf) });
  });
  afterEach(() => vi.restoreAllMocks());

  it('opens synchronously and prints every page from the generated PDF', async () => {
    const job = openPdfPrintWindow();
    expect(window.open).toHaveBeenCalledOnce();
    expect(state.getDocument).not.toHaveBeenCalled();
    await job.print(blob);
    expect(pdf.getPage.mock.calls.map(call => call[0])).toEqual([1, 2]);
    expect(preview.document.querySelectorAll('section')).toHaveLength(2);
    expect(preview.document.body.textContent).not.toContain('Preparing');
    expect(preview.print).toHaveBeenCalledOnce();
    expect(pdf.destroy).toHaveBeenCalledOnce();
  });

  it('does not send an outdated document to the print dialog', async () => {
    const job = openPdfPrintWindow();
    await expect(job.print(blob, () => false)).rejects.toThrow('document changed');
    expect(preview.print).not.toHaveBeenCalled();
    expect(state.getDocument).not.toHaveBeenCalled();
  });

  it('reports a blocked print window before starting document generation', () => {
    vi.mocked(window.open).mockReturnValue(null);
    expect(openPdfPrintWindow).toThrow('allow popups');
    expect(state.getDocument).not.toHaveBeenCalled();
  });
  it('prints the PDF in an isolated frame without opening or focusing a popup', async () => {
    const job = openPdfPrintFrame();
    const frame = document.querySelector<HTMLIFrameElement>('[data-pdf-print-frame]')!;
    const child = frame.contentWindow!;
    Object.defineProperty((child as unknown as {HTMLImageElement: typeof HTMLImageElement}).HTMLImageElement.prototype, 'decode', {configurable:true,value:vi.fn(async()=>{})});
    const print = vi.spyOn(child, 'print').mockImplementation(() => {});
    const pending = job.print(blob);
    await vi.waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(window.open).not.toHaveBeenCalled();
    expect(frame.contentDocument!.querySelectorAll('section')).toHaveLength(2);
    child.dispatchEvent(new Event('afterprint'));
    await pending;
    expect(frame.isConnected).toBe(false);
    expect(pdf.destroy).toHaveBeenCalledOnce();
  });
});
