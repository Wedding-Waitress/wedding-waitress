import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CEREMONY_A4 } from '@/lib/ceremonyFloorPlanA4';
import { PDF_DEFAULT_OPTIONS, savePdfAsync } from '@/lib/pdfExportUtils';
import {
  assertAuthoritativeMirrorDocument,
  CEREMONY_PRINT_MIRROR_CONTRACT,
  preparePrintMirrorClone,
} from '@/lib/printPdfMirrorContract';

export interface CeremonyPreviewPdfOptions {
  pageElement: HTMLElement;
  eventName: string;
  eventDate?: string | null;
}

export const prepareCeremonyPdfClone = (clonedDocument: Document): void => {
  preparePrintMirrorClone(clonedDocument, CEREMONY_PRINT_MIRROR_CONTRACT);
};

const waitForAssets = async (element: HTMLElement): Promise<void> => {
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
  if (!dateValue) return new Date().toISOString().slice(0, 10);
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue.slice(0, 10);
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

/** Builds the PDF from the visible authoritative A4 renderer; there is no PDF-only layout. */
export const createCeremonyPreviewPdf = async ({ pageElement }: CeremonyPreviewPdfOptions): Promise<jsPDF> => {
  assertAuthoritativeMirrorDocument(pageElement, CEREMONY_PRINT_MIRROR_CONTRACT);
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
    onclone: prepareCeremonyPdfClone,
  });

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', ...PDF_DEFAULT_OPTIONS });
  pdf.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    0,
    0,
    CEREMONY_A4.widthMm,
    CEREMONY_A4.heightMm,
    undefined,
    'FAST',
  );

  return pdf;
};

/** Captures and downloads the same PDF used by the visual mirror workflow. */
export const exportCeremonyPreviewToPdf = async (options: CeremonyPreviewPdfOptions): Promise<void> => {
  const pdf = await createCeremonyPreviewPdf(options);

  const safeName = options.eventName.replace(/[/:*?"<>|]/g, '');
  await savePdfAsync(pdf, `${safeName}-Ceremony-Floor Plan-${formatFileDate(options.eventDate)}.pdf`);
};
