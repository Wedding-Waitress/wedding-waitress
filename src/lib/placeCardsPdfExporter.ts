import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDF_DEFAULT_OPTIONS, savePdfAsync } from '@/lib/pdfExportUtils';
import { assertAuthoritativeMirrorDocument } from '@/lib/printPdfMirrorContract';

export const PLACE_CARD_PRINT_CONTRACT = {
  id: 'name-place-cards', selector: '[data-print-mirror-document="name-place-cards"]',
  widthMm: 210, heightMm: 297, orientation: 'portrait' as const,
};
export interface PlaceCardPdfOptions {
  pageElement: () => HTMLElement | null;
  pageIndex: number;
  totalPages: number;
  eventName: string;
  showPage: (index: number) => Promise<void>;
}
/** Neutralise only external preview presentation, retaining all card geometry. */
export function preparePlaceCardPdfClone(doc: Document) {
  const page = doc.querySelector<HTMLElement>(PLACE_CARD_PRINT_CONTRACT.selector);
  for (let node = page; node; node = node.parentElement) {
    node.style.setProperty('transform', 'none', 'important');
    node.style.setProperty('transform-origin', 'top left', 'important');
    node.style.setProperty('box-shadow', 'none', 'important');
  }
}
async function capturePage(page: HTMLElement) {
  assertAuthoritativeMirrorDocument(page, PLACE_CARD_PRINT_CONTRACT);
  await document.fonts.ready;
  const sources = new Set<string>();
  page.querySelectorAll('img').forEach(img => sources.add(img.currentSrc || img.src));
  [page, ...page.querySelectorAll<HTMLElement>('*')].forEach(node => {
    const match = /^url\(["']?(.*?)["']?\)$/.exec(getComputedStyle(node).backgroundImage);
    if (match) sources.add(match[1]);
  });
  await Promise.all([...sources].filter(Boolean).map(async src => {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.src = src;
    try { await image.decode(); } catch { throw new Error('A place card image could not load. Try again before printing.'); }
  }));
  return html2canvas(page, { scale: 300 / 96, width: 210 * 96 / 25.4, height: 297 * 96 / 25.4,
    useCORS: true, backgroundColor: '#ffffff', logging: false, onclone: preparePlaceCardPdfClone });
}
export async function createPlaceCardsPDF(options: PlaceCardPdfOptions, allPages = false): Promise<jsPDF> {
  if (options.totalPages < 1 || options.pageIndex < 0 || options.pageIndex >= options.totalPages) throw new Error('No place card page is available.');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', ...PDF_DEFAULT_OPTIONS });
  const indices = allPages ? Array.from({ length: options.totalPages }, (_, i) => i) : [options.pageIndex];
  try {
    for (const [position, index] of indices.entries()) {
      await options.showPage(index);
      const page = options.pageElement();
      if (page === null || Number(page.dataset.page) !== index) throw new Error('The selected place card page is not ready.');
      const canvas = await capturePage(page);
      if (position > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      canvas.width = 0; canvas.height = 0;
    }
    return pdf;
  } finally { await options.showPage(options.pageIndex); }
}
export async function exportPlaceCardPageToPdf(options: PlaceCardPdfOptions) {
  await savePdfAsync(await createPlaceCardsPDF(options), `PlaceCards-WeddingWaitress-Page-${options.pageIndex + 1}-${options.eventName}.pdf`);
}
export async function exportAllPlaceCardsToPdf(options: PlaceCardPdfOptions) {
  await savePdfAsync(await createPlaceCardsPDF(options, true), `PlaceCards-WeddingWaitress-AllPages-${options.eventName}.pdf`);
}
