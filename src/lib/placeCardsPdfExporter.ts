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

/**
 * Capture a single place card page as high-resolution image
 * @param pageIndex - The page number to capture (0-based)
 * @returns Base64 encoded PNG image at 300 DPI
 */
const convertPlaceCardPageToImage = async (
  pageIndex: number
): Promise<string> => {
  const pageElement = document.querySelector(
    `[data-page="${pageIndex}"]`
  ) as HTMLElement;

  if (!pageElement) {
    throw new Error(`Page ${pageIndex} not found in DOM`);
  }

  // Capture at full 300 DPI size (already sized at 2480×3508px)
  const canvas = await html2canvas(pageElement, {
    scale: 1,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FFFFFF',
    width: 2480,
    height: 3508,
    windowWidth: 2480,
    windowHeight: 3508,
  });

  return canvas.toDataURL('image/png');
};

/**
 * Export a single place cards page to PDF document
 */
export const exportPlaceCardPageToPdf = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  pageIndex: number
): Promise<void> => {
  try {
    // Capture the page as image
    const imageData = await convertPlaceCardPageToImage(pageIndex);

    // Create PDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add the captured image to fill entire A4 page
    pdf.addImage(imageData, 'PNG', 0, 0, 210, 297);

    // Generate filename
    const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const fileName = `${sanitizedName}-place-cards-page-${pageIndex + 1}-${today}.pdf`;

    // Save the PDF
    pdf.save(fileName);
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
  totalPages: number
): Promise<void> => {
  try {
    // Create PDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Capture and add each page
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const imageData = await convertPlaceCardPageToImage(pageIndex);
      pdf.addImage(imageData, 'PNG', 0, 0, 210, 297);
    }

    // Generate filename
    const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const fileName = `${sanitizedName}-place-cards-all-pages-${today}.pdf`;

    // Save the PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('All place cards PDF export error:', error);
    throw error;
  }
};
