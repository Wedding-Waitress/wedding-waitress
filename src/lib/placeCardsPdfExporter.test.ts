import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPlaceCardsPDF, preparePlaceCardPdfClone } from './placeCardsPdfExporter';
const mocks = vi.hoisted(() => ({ capture: vi.fn(), addImage: vi.fn(), addPage: vi.fn() }));
vi.mock('html2canvas', () => ({ default: mocks.capture }));
vi.mock('jspdf', () => ({ default: class { addImage = mocks.addImage; addPage = mocks.addPage; } }));
vi.mock('@/lib/printPdfMirrorContract', () => ({ assertAuthoritativeMirrorDocument: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks(); document.body.innerHTML = '<div style="transform:scale(.5)"><div data-print-mirror-document="name-place-cards" data-page="0"><span style="transform:rotate(20deg)">Guest</span></div></div>';
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
  mocks.capture.mockResolvedValue({ toDataURL: () => 'data:image/png;base64,test', width: 100, height: 100 });
});
const options = () => ({ pageElement: () => document.querySelector<HTMLElement>('[data-page]'), pageIndex: 1, totalPages: 2, eventName: 'Test', showPage: vi.fn(async (index: number) => { document.querySelector<HTMLElement>('[data-page]')!.dataset.page = String(index); }) });
describe('Place card authoritative PDF export', () => {
  it('exports the selected second page rather than page one', async () => {
    const o = options(); await createPlaceCardsPDF(o);
    expect(o.showPage.mock.calls.map(([i]) => i)).toEqual([1, 1]);
    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.addImage).toHaveBeenCalledWith(expect.any(String), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  });
  it('captures each visible page once and restores the original selection', async () => {
    const o = options(); await createPlaceCardsPDF(o, true);
    expect(o.showPage.mock.calls.map(([i]) => i)).toEqual([0, 1, 1]);
    expect(mocks.capture).toHaveBeenCalledTimes(2); expect(mocks.addPage).toHaveBeenCalledTimes(1);
  });
  it('restores the page after capture fails', async () => {
    mocks.capture.mockRejectedValueOnce(new Error('image unavailable'));
    const o = options(); await expect(createPlaceCardsPDF(o, true)).rejects.toThrow('image unavailable');
    expect(o.showPage.mock.calls.map(([i]) => i)).toEqual([0, 1]);
  });
  it('retains internal rotation while removing external preview scaling', () => {
    preparePlaceCardPdfClone(document);
    expect(document.querySelector('span')!.style.transform).toBe('rotate(20deg)');
    expect(document.querySelector<HTMLElement>('[data-page]')!.parentElement!.style.transform).toBe('none');
  });
});
