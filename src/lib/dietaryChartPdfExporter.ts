import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDF_DEFAULT_OPTIONS, savePdfAsync } from '@/lib/pdfExportUtils';

type DietaryPreviewPdfOptions = {
  eventName: string;
  eventDate?: string | null;
  mode: 'single' | 'all';
  pageNumbers: number[];
  currentPage: number;
  renderPage: (pageNumber: number) => Promise<void>;
  getPageElement: () => HTMLElement | null;
};

/**
 * html2canvas rasterises table text fractionally lower than Chromium paints the
 * live A4 preview. Wrap only the requested textual content in the cloned DOM
 * so the PDF is optically centred without changing preview layout, dimensions,
 * table cells, or the footer.
 */
export const DIETARY_PDF_TEXT_OFFSETS = {
  summary: -8,
  columnHeading: -8,
  guestCell: -6,
  ancillary: -4,
} as const;

const PDF_TEXT_RULES = [
  { group: 'summary', selector: '[data-pdf-text-nudge="summary"]', offsetPx: DIETARY_PDF_TEXT_OFFSETS.summary },
  { group: 'column-heading', selector: '[data-pdf-text-nudge="column-heading"]', offsetPx: DIETARY_PDF_TEXT_OFFSETS.columnHeading },
  { group: 'guest-cell', selector: '[data-pdf-text-nudge="guest-cell"]', offsetPx: DIETARY_PDF_TEXT_OFFSETS.guestCell },
  { group: 'ancillary', selector: '[data-pdf-text-nudge="details"], [data-pdf-text-nudge="total"]', offsetPx: DIETARY_PDF_TEXT_OFFSETS.ancillary },
] as const;

export const alignDietaryPdfTextInClone = (clonedDocument: Document): void => {
  PDF_TEXT_RULES.forEach(({ group, selector, offsetPx }) => {
    clonedDocument.querySelectorAll<HTMLElement>(selector).forEach(element => {
      const textWrapper = clonedDocument.createElement('span');
      textWrapper.dataset.dietaryPdfTextGroup = group;
      textWrapper.style.cssText = `display: block; transform: translateY(${offsetPx}px);`;
      while (element.firstChild) textWrapper.appendChild(element.firstChild);
      element.appendChild(textWrapper);
    });
  });
};

const waitForPreviewAssets = async (element: HTMLElement): Promise<void> => {
  if ('fonts' in document) await document.fonts.ready;
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map(image => image.complete
    ? Promise.resolve()
    : new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      })));
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};

const formatFileDate = (dateValue?: string | null): string => {
  if (!dateValue) return new Date().toISOString().split('T')[0];
  const date = new Date(`${dateValue}T00:00:00`);
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

export const exportDietaryPreviewToPdf = async ({
  eventName,
  eventDate,
  mode,
  pageNumbers,
  currentPage,
  renderPage,
  getPageElement,
}: DietaryPreviewPdfOptions): Promise<void> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', ...PDF_DEFAULT_OPTIONS });

  try {
    for (let index = 0; index < pageNumbers.length; index += 1) {
      await renderPage(pageNumbers[index]);
      const pageElement = getPageElement();
      if (!pageElement) throw new Error('Dietary A4 preview sheet was not found.');
      await waitForPreviewAssets(pageElement);

      const canvas = await html2canvas(pageElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: pageElement.scrollWidth,
        height: pageElement.scrollHeight,
        windowWidth: pageElement.scrollWidth,
        windowHeight: pageElement.scrollHeight,
        onclone: alignDietaryPdfTextInClone,
      });

      if (index > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }
  } finally {
    await renderPage(currentPage);
  }

  const safeName = eventName.replace(/[/:*?"<>|]/g, '');
  const label = mode === 'single' ? 'Single Page' : 'All Pages';
  await savePdfAsync(pdf, `${safeName}-Dietary Requirements-${label}-${formatFileDate(eventDate)}.pdf`);
};
