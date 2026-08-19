/**
 * Place Cards PDF Exporter
 * 
 * Generates PDF documents for place cards with:
 * - A4 paper size (210mm × 297mm)
 * - 1.27cm margins
 * - Image capture at 300 DPI for pixel-perfect export
 * - 2×3 grid layout (6 cards per page)
 * - Standard 105mm × 99mm foldable place cards
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { PDF_DEFAULT_OPTIONS } from '@/lib/pdfExportUtils';

const yieldPlaceCardExport = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const savePlaceCardPdf = async (pdf: jsPDF, fileName: string): Promise<void> => {
  await yieldPlaceCardExport();
  const url = URL.createObjectURL(pdf.output('blob'));
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  await yieldPlaceCardExport();
};

/**
 * Capture a single place card page as high-resolution image
 * @param pageIndex - The page number to capture (0-based)
 * @returns Base64 encoded PNG image at 300 DPI
 */
const convertPlaceCardPageToImage = async (
  pageIndex: number,
  root: ParentNode = document,
): Promise<string> => {
  const pageElement = root.querySelector(
    `[data-page="${pageIndex}"]`
  ) as HTMLElement;

  if (!pageElement) {
    throw new Error(`Page ${pageIndex} not found in DOM`);
  }

  // Target A4 @ 300 DPI
  const A4_MM_W = 210;
  const A4_MM_H = 297;
  const DPI = 300;
  const targetWidthPx = Math.round((A4_MM_W / 25.4) * DPI);  // 2480
  const targetHeightPx = Math.round((A4_MM_H / 25.4) * DPI); // 3508

  // Element's current pixel size (CSS -> px)
  const rect = pageElement.getBoundingClientRect();
  // Guard: avoid division by zero
  const baseW = Math.max(1, rect.width);
  const baseH = Math.max(1, rect.height);

  // Scale so output bitmap matches our DPI target
  const scaleX = targetWidthPx / baseW;
  const scaleY = targetHeightPx / baseH;
  const scale = Math.min(scaleX, scaleY);

  const canvas = await html2canvas(pageElement, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FFFFFF',
  });

  return canvas.toDataURL('image/jpeg', 0.95);
};

const drawPhotoVideoQr = (
  pdf: jsPDF,
  settings: PlaceCardSettings | null,
  qrDataUrl: string | null | undefined,
  cardCount: number,
) => {
  if (!settings?.photo_video_qr_enabled || !qrDataUrl) return;
  const sizePct = Math.max(12, Math.min(36, Number(settings.photo_video_qr_size ?? 22)));
  const sizeMm = 105 * sizePct / 100;
  const halfX = sizePct / 2;
  const halfY = sizeMm / 49.5 * 50;
  const xPct = Math.max(halfX, Math.min(100 - halfX, Number(settings.photo_video_qr_x ?? 50)));
  const yPct = Math.max(halfY, Math.min(100 - halfY, Number(settings.photo_video_qr_y ?? 50)));
  for (let index = 0; index < Math.min(6, cardCount); index += 1) {
    const cardX = (index % 2) * 105;
    const cardY = Math.floor(index / 2) * 99;
    const x = cardX + 105 * xPct / 100 - sizeMm / 2;
    const y = cardY + 49.5 * yPct / 100 - sizeMm / 2;
    pdf.addImage(qrDataUrl, 'PNG', x, y, sizeMm, sizeMm, 'place-card-photo-video-qr', 'FAST');
  }
};

/**
 * Export a single place cards page to PDF document
 */
export const exportPlaceCardPageToPdf = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  pageIndex: number,
  qrDataUrl?: string | null,
): Promise<void> => {
  try {
    // Capture the page as image
    const imageData = await convertPlaceCardPageToImage(pageIndex);

    // Create PDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      ...PDF_DEFAULT_OPTIONS,
    });

    // Add the captured image to fill entire A4 page
    // Keep every source pixel exact while avoiding minutes of synchronous
    // recompression for each 300-DPI page.
    pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297);
    drawPhotoVideoQr(pdf, settings, qrDataUrl, guests.slice(pageIndex * 6, pageIndex * 6 + 6).length);

    // Generate filename
    const fileName = `PlaceCards-WeddingWaitress-SinglePage-${event.name}.pdf`;

    // Save the PDF (async blob download for stability)
    await savePlaceCardPdf(pdf, fileName);
  } catch (error) {
    console.error('Place card PDF export error:', error);
    throw error;
  }
};

/**
 * Export all place cards pages to a single multi-page PDF document
 */
export const exportAllPlaceCardsToPdf = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  totalPages: number,
  qrDataUrl?: string | null,
): Promise<void> => {
  // Find and temporarily show the hidden print container
  const printContainer = document.querySelector('.hidden.print\\:block') as HTMLElement;
  if (printContainer) {
    printContainer.style.display = 'block';
    // Keep the export DOM at a real viewport coordinate. Very large negative
    // offsets can make html2canvas spend minutes rasterising an enormous
    // intermediate surface on multi-page exports.
    printContainer.style.position = 'fixed';
    printContainer.style.left = '0';
    printContainer.style.top = '0';
    printContainer.style.zIndex = '-1000';
    printContainer.style.pointerEvents = 'none';
  }

  try {
    // Create PDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      ...PDF_DEFAULT_OPTIONS,
    });

    // Capture and add each page
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage();
        await yieldPlaceCardExport();
      }

      const imageData = await convertPlaceCardPageToImage(pageIndex, printContainer || document);
      pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297);
      drawPhotoVideoQr(pdf, settings, qrDataUrl, guests.slice(pageIndex * 6, pageIndex * 6 + 6).length);
    }

    // Generate filename
    const fileName = `PlaceCards-WeddingWaitress-AllPages-${event.name}.pdf`;

    // Save the PDF (async blob download for stability)
    await savePlaceCardPdf(pdf, fileName);
  } catch (error) {
    console.error('All place cards PDF export error:', error);
    throw error;
  } finally {
    // Restore hidden state
    if (printContainer) {
      printContainer.style.display = '';
      printContainer.style.position = '';
      printContainer.style.left = '';
      printContainer.style.top = '';
      printContainer.style.zIndex = '';
      printContainer.style.pointerEvents = '';
    }
  }
};
