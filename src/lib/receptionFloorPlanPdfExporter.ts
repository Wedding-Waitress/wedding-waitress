import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { A4_MM } from '@/lib/a4';
import { PDF_DEFAULT_OPTIONS, savePdfAsync } from '@/lib/pdfExportUtils';
import {
  assertAuthoritativeMirrorDocument,
  preparePrintMirrorClone,
  RECEPTION_PRINT_MIRROR_CONTRACT,
} from '@/lib/printPdfMirrorContract';

export type ReceptionPdfPageSize = 'a4';

export interface ReceptionPdfEvent {
  name: string;
  date?: string | null;
  venue?: string | null;
  partner1_name?: string | null;
  partner2_name?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
}

export interface ReceptionPreviewPdfOptions {
  pageElement: HTMLElement;
  eventName: string;
  eventDate?: string | null;
}

export const prepareReceptionPdfClone = (clonedDocument: Document): void => {
  preparePrintMirrorClone(clonedDocument, RECEPTION_PRINT_MIRROR_CONTRACT);
  clonedDocument
    .querySelectorAll<HTMLElement>('[data-reception-screen-only="true"]')
    .forEach((element) => element.remove());
};

const waitForAssets = async (element: HTMLElement): Promise<void> => {
  if ('fonts' in document) await document.fonts.ready;
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
};

const formatFileDate = (dateValue?: string | null): string => {
  if (!dateValue) return new Date().toISOString().slice(0, 10);
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue.slice(0, 10);
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

/** Captures the visible authoritative Reception A4 node without rebuilding geometry. */
export const createReceptionPreviewPdf = async ({
  pageElement,
}: ReceptionPreviewPdfOptions): Promise<jsPDF> => {
  assertAuthoritativeMirrorDocument(pageElement, RECEPTION_PRINT_MIRROR_CONTRACT);
  await waitForAssets(pageElement);

  const canvas = await html2canvas(pageElement, {
    backgroundColor: '#ffffff',
    scale: 3,
    useCORS: true,
    logging: false,
    width: pageElement.offsetWidth,
    height: pageElement.offsetHeight,
    windowWidth: pageElement.offsetWidth,
    windowHeight: pageElement.offsetHeight,
    onclone: prepareReceptionPdfClone,
  });

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    ...PDF_DEFAULT_OPTIONS,
  });
  pdf.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    0,
    0,
    A4_MM.height,
    A4_MM.width,
    undefined,
    'FAST',
  );
  return pdf;
};

export const exportReceptionPreviewToPdf = async (
  options: ReceptionPreviewPdfOptions,
): Promise<void> => {
  const pdf = await createReceptionPreviewPdf(options);
  const safeName = options.eventName.replace(/[/:*?"<>|]/g, '');
  await savePdfAsync(
    pdf,
    `${safeName}-Reception-Floor Plan-${formatFileDate(options.eventDate)}.pdf`,
  );
};
