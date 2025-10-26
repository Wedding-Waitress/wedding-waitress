/**
 * Place Cards Word (.docx) Exporter
 * 
 * Generates Microsoft Word documents for place cards with:
 * - A4 paper size (210mm × 297mm)
 * - Zero margins (margins baked into captured image)
 * - Image capture at 300 DPI for pixel-perfect export
 * - 2×3 grid layout (6 cards per page)
 * - Standard 105mm × 99mm foldable place cards
 */

import { Document, Packer, Paragraph, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
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

  return canvas.toDataURL('image/png');
};

/**
 * Export a single place cards page to Word document with image capture
 */
export const exportPlaceCardPageToDocx = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  pageIndex: number
): Promise<void> => {
  try {
    // Capture the page as image
    const imageData = await convertPlaceCardPageToImage(pageIndex);
    
    // Convert base64 to buffer
    const base64Data = imageData.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Create Word document with image
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              width: 11906,  // 210mm in DXA
              height: 16838, // 297mm in DXA
            },
            margin: {
              top: 0,    // No margins - image includes them
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer as any,
                transformation: {
                  width: 794,  // 210mm in points (210 * 72/25.4)
                  height: 1123, // 297mm in points (297 * 72/25.4)
                },
                type: 'png',
              } as any),
            ],
          }),
        ],
      }],
    });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
    const fileName = `${sanitizedName}-Place-Cards-Page-${pageIndex + 1}.docx`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Place card export error:', error);
    throw error;
  }
};

/**
 * Export all place cards pages to a single multi-page Word document
 */
export const exportAllPlaceCardsToDocx = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  totalPages: number
): Promise<void> => {
  try {
    const sections: any[] = [];

    // Capture each page
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const imageData = await convertPlaceCardPageToImage(pageIndex);
      const base64Data = imageData.split(',')[1];
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      sections.push({
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer as any,
                transformation: {
                  width: 794,
                  height: 1123,
                },
                type: 'png',
              } as any),
            ],
          }),
        ],
      });
    }

    // Create multi-page document
    const doc = new Document({ sections });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
    const fileName = `${sanitizedName}-Place-Cards-All.docx`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('All place cards export error:', error);
    throw error;
  }
};
