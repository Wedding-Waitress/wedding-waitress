import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDF_DEFAULT_OPTIONS, savePdfAsync, yieldToBrowser } from '@/lib/pdfExportUtils';
import { assertAuthoritativeMirrorDocument } from '@/lib/printPdfMirrorContract';

export const INVITATION_PRINT_MIRROR_CONTRACT = {
  id: 'invitation-card', selector: '[data-print-mirror-document="invitation-card"]',
  widthMm: 210, heightMm: 297, orientation: 'portrait' as const,
};
export interface InvitationPreviewPdfOptions { pageElement: HTMLElement; widthMm: number; heightMm: number; }

/** Capture the selected paper itself; never add export-only margins or cropping. */
export function fitInvitationToPaper(widthMm: number, heightMm: number) {
  if (!(widthMm > 0 && heightMm > 0 && Number.isFinite(widthMm) && Number.isFinite(heightMm))) throw new Error('Choose a valid print size.');
  return { x: 0, y: 0, width: widthMm, height: heightMm };
}

/** Only neutralise preview presentation; keep internal image/text/QR geometry. */
export function prepareInvitationPdfClone(doc: Document) {
  const page = doc.querySelector<HTMLElement>(INVITATION_PRINT_MIRROR_CONTRACT.selector);
  for (let node = page; node; node = node.parentElement) {
    node.style.setProperty('transform', 'none', 'important');
    node.style.setProperty('transform-origin', 'top left', 'important');
    node.style.setProperty('box-shadow', 'none', 'important');
  }
}

async function waitForCardAssets(page: HTMLElement) {
  await document.fonts.ready;
  const sources = new Set<string>();
  page.querySelectorAll('img').forEach(img => sources.add(img.currentSrc || img.src));
  [page, ...page.querySelectorAll<HTMLElement>('*')].forEach(node => {
    const match = /^url\(["']?(.*?)["']?\)$/.exec(getComputedStyle(node).backgroundImage);
    if (match) sources.add(match[1]);
  });
  await Promise.all([...sources].filter(Boolean).map(async src => {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.src = src;
    try { await image.decode(); } catch { throw new Error('A card image could not be loaded. Please try again before printing.'); }
  }));
}

export async function createInvitationPreviewPDF({ pageElement, widthMm, heightMm }: InvitationPreviewPdfOptions): Promise<jsPDF> {
  assertAuthoritativeMirrorDocument(pageElement, { ...INVITATION_PRINT_MIRROR_CONTRACT, widthMm, heightMm, orientation: widthMm > heightMm ? 'landscape' : 'portrait' });
  await waitForCardAssets(pageElement);
  const fit = fitInvitationToPaper(widthMm, heightMm);
  const pdf = new jsPDF({ orientation: widthMm > heightMm ? 'landscape' : 'portrait', unit: 'mm', format: [widthMm, heightMm], ...PDF_DEFAULT_OPTIONS });
  pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, widthMm, heightMm, 'F');
  const pixelWidth = Math.ceil(fit.width * 300 / 25.4);
  const pixelHeight = Math.ceil(fit.height * 300 / 25.4);
  const scale = pixelWidth / parseFloat(getComputedStyle(pageElement).width);
  // Capture the SAME document in bounded tiles at 300 DPI, avoiding a large canvas.
  const tileSize = 2048;
  for (let y = 0; y < pixelHeight; y += tileSize) {
    for (let x = 0; x < pixelWidth; x += tileSize) {
      await yieldToBrowser();
      const tileWidth = Math.min(tileSize, pixelWidth - x), tileHeight = Math.min(tileSize, pixelHeight - y);
      const canvas = document.createElement('canvas'); canvas.width = tileWidth; canvas.height = tileHeight;
      await html2canvas(pageElement, {
        canvas, scale, x: x / scale, y: y / scale,
        width: tileWidth / scale, height: tileHeight / scale,
        backgroundColor: '#ffffff', useCORS: true, logging: false,
        onclone: prepareInvitationPdfClone,
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG',
        fit.x + x / pixelWidth * fit.width, fit.y + y / pixelHeight * fit.height,
        tileWidth / pixelWidth * fit.width, tileHeight / pixelHeight * fit.height,
        undefined, 'FAST');
      canvas.width = 0; canvas.height = 0;
    }
  }
  return pdf;
}
export async function exportInvitationPreviewPDF(options: InvitationPreviewPdfOptions, fileName: string): Promise<void> {
  await savePdfAsync(await createInvitationPreviewPDF(options), fileName);
}
