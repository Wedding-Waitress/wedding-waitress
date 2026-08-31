import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDF_DEFAULT_OPTIONS, savePdfAsync } from '@/lib/pdfExportUtils';
import { assertAuthoritativeMirrorDocument, EVENT_BUDGET_PRINT_MIRROR_CONTRACT, preparePrintMirrorClone } from '@/lib/printPdfMirrorContract';

export const prepareEventBudgetPdfClone = (clonedDocument: Document): void => {
  preparePrintMirrorClone(clonedDocument, EVENT_BUDGET_PRINT_MIRROR_CONTRACT);
  clonedDocument.querySelectorAll<HTMLElement>(EVENT_BUDGET_PRINT_MIRROR_CONTRACT.selector).forEach(page => {
    const presentation = page.closest<HTMLElement>('[data-print-mirror-presentation="true"]');
    if (presentation) { presentation.style.border = '0'; presentation.style.boxShadow = 'none'; presentation.style.transform = 'none'; presentation.style.transformOrigin = 'top left'; }
  });
};

const waitForAssets = async (root: HTMLElement): Promise<void> => {
  if ('fonts' in document) await document.fonts.ready;
  await Promise.all(Array.from(root.querySelectorAll('img')).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
    image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => resolve(), { once: true });
  })));
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};

export const createEventBudgetPdf = async (documentRoot: HTMLElement): Promise<jsPDF> => {
  const pages = Array.from(documentRoot.querySelectorAll<HTMLElement>(EVENT_BUDGET_PRINT_MIRROR_CONTRACT.selector));
  if (!pages.length) throw new Error('The Event Budget print preview is not ready.');
  await waitForAssets(documentRoot);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', ...PDF_DEFAULT_OPTIONS });
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    assertAuthoritativeMirrorDocument(page, EVENT_BUDGET_PRINT_MIRROR_CONTRACT);
    const canvas = await html2canvas(page, { backgroundColor: '#fffdfa', scale: 2, useCORS: true, logging: false,
      width: page.offsetWidth, height: page.offsetHeight, windowWidth: page.offsetWidth, windowHeight: page.offsetHeight,
      onclone: prepareEventBudgetPdfClone });
    if (index > 0) pdf.addPage('a4', 'landscape');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210, undefined, 'FAST');
  }
  return pdf;
};

export const exportEventBudgetPdf = async (documentRoot: HTMLElement, eventName: string): Promise<void> => {
  const pdf = await createEventBudgetPdf(documentRoot);
  const safeName = eventName.replace(/[/:*?"<>|]/g, '').trim() || 'Event';
  await savePdfAsync(pdf, `${safeName}-Event-Budget-Planner.pdf`);
};
