import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDF_DEFAULT_OPTIONS, savePdfAsync } from './pdfExportUtils';

export interface FullSeatingPreviewPdfOptions {
  eventName: string;
  mode: 'single' | 'all';
  pageNumbers: number[];
  currentPage: number;
  renderPage: (page: number) => Promise<void>;
  getPageElement: () => HTMLElement | null;
}

// Only external preview presentation is removed; the A4 contents are untouched.
export const prepareFullSeatingPdfClone = (doc: Document) => {
  doc.querySelectorAll<HTMLElement>('[data-full-seating-presentation]').forEach(el => {
    el.style.transform = 'none';
    el.style.transformOrigin = 'initial';
  });
  doc.querySelectorAll<HTMLElement>('[data-a4-preview-page]').forEach(el => {
    el.style.border = 'none';
    el.style.boxShadow = 'none';
  });
};

export const createFullSeatingPreviewPdf = async (options: FullSeatingPreviewPdfOptions) => {
  if (!options.pageNumbers.length) throw new Error('No seating chart pages to export.');
  // html2canvas inserts this 1px GIF outside the chart to measure font baselines.
  // Tailwind's img { display:block } makes that probe occupy a separate line.
  // Correct only the library's temporary probe, never the document's images/text.
  const metricsStyle = document.createElement('style');
  metricsStyle.textContent = 'body > div > img[src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"][width="1"][height="1"] { display:inline !important; }';
  document.head.appendChild(metricsStyle);
  const pdf = new jsPDF({ ...PDF_DEFAULT_OPTIONS, orientation: 'portrait', unit: 'mm', format: 'a4' });
  try {
    for (const [index, page] of options.pageNumbers.entries()) {
      await options.renderPage(page);
      const element = options.getPageElement();
      if (!element) throw new Error('Seating chart preview is unavailable.');
      await document.fonts.ready;
      await Promise.all(Array.from(element.querySelectorAll('img')).map(image => image.decode().catch(() => undefined)));
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const canvas = await html2canvas(element, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
        onclone: prepareFullSeatingPdfClone,
      });
      if (index) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }
    return pdf;
  } finally {
    metricsStyle.remove();
    await options.renderPage(options.currentPage);
  }
};

export const exportFullSeatingPreviewPdf = async (options: FullSeatingPreviewPdfOptions) => {
  const pdf = await createFullSeatingPreviewPdf(options);
  const name = options.eventName.replace(/[/:*?"<>|]/g, '');
  await savePdfAsync(pdf, `${name}-Full Seating Chart-${options.mode === 'single' ? 'Single Page' : 'All Pages'}.pdf`);
};
