import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDF_DEFAULT_OPTIONS } from '@/lib/pdfExportUtils';
import { assertAuthoritativeMirrorDocument } from '@/lib/printPdfMirrorContract';

export const DIETARY_CARDS_PRINT_CONTRACT = {
  id: 'dietary-cards', selector: '[data-print-mirror-document="dietary-cards"]',
  widthMm: 210, heightMm: 297, orientation: 'portrait' as const,
};

/** Only the outside preview scale is removed; card faces and folds are unchanged. */
export function prepareDietaryCardsPdfClone(doc: Document) {
  const sheet = doc.querySelector<HTMLElement>(DIETARY_CARDS_PRINT_CONTRACT.selector);
  for (let node = sheet?.parentElement; node; node = node.parentElement) {
    node.style.setProperty('transform', 'none', 'important');
    node.style.setProperty('transform-origin', 'top left', 'important');
  }
}

export interface DietaryCardsPdfOptions {
  getSheet: () => HTMLElement | null;
  showPage: (index: number) => Promise<void>;
  currentPage: number;
  totalPages: number;
  assertContext: () => void;
}

export async function createDietaryCardsPdf(options: DietaryCardsPdfOptions): Promise<jsPDF> {
  if (options.totalPages < 1) throw new Error('There are no dietary cards to print.');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', ...PDF_DEFAULT_OPTIONS });
  // Ask supporting PDF viewers to preserve physical card dimensions rather
  // than fit the A4 artwork into the printer's smaller printable area.
  pdf.viewerPreferences({ PrintScaling: 'None', PickTrayByPDFSize: true });
  try {
    for (let index = 0; index < options.totalPages; index++) {
      options.assertContext();
      await options.showPage(index);
      await document.fonts.ready;
      options.assertContext();
      const sheet = options.getSheet();
      if (!sheet || Number(sheet.dataset.page) !== index) throw new Error('The dietary card sheet is not ready.');
      assertAuthoritativeMirrorDocument(sheet, DIETARY_CARDS_PRINT_CONTRACT);
      if (sheet.querySelector('[data-card-overflow="true"]')) {
        throw new Error('A card contains too much text to fit. Review the highlighted guest before downloading.');
      }
      const canvas = await html2canvas(sheet, {
        scale: 300 / 96, width: 210 * 96 / 25.4, height: 297 * 96 / 25.4,
        backgroundColor: '#ffffff', useCORS: true, logging: false,
        onclone: prepareDietaryCardsPdfClone,
      });
      options.assertContext();
      if (index) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      canvas.width = canvas.height = 0;
    }
    return pdf;
  } finally {
    await options.showPage(options.currentPage);
  }
}
