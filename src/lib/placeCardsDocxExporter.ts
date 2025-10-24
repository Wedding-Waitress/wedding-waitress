/**
 * Place Cards Word (.docx) Exporter
 * 
 * Generates Microsoft Word documents for place cards with:
 * - A4 paper size (210mm × 297mm)
 * - Narrow margins (1.27cm all sides)
 * - HTML-to-PNG conversion at 300 DPI for visual fidelity
 * - Single page or all pages export
 */

import { Document, Packer, Paragraph, ImageRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';

/**
 * Convert place card page HTML element to high-resolution PNG image buffer
 * @param pageElement - The HTML element containing the place cards page
 * @param withMargins - Whether to add visual margin padding
 * @returns Uint8Array buffer of PNG image
 */
const convertPlaceCardPageToImage = async (
  pageElement: HTMLElement,
  withMargins: boolean = true
): Promise<Uint8Array> => {
  // 300 DPI resolution for A4 size
  const dpi = 300;
  const a4WidthMM = 210;
  const a4HeightMM = 297;
  const marginMM = withMargins ? 12.7 : 0; // 1.27cm = 12.7mm margins
  
  const mmToPx = dpi / 25.4;
  const fullWidth = Math.floor(a4WidthMM * mmToPx);
  const fullHeight = Math.floor(a4HeightMM * mmToPx);
  
  // Create temporary container at 300 DPI
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.width = `${fullWidth}px`;
  container.style.height = `${fullHeight}px`;
  container.style.backgroundColor = '#FFFFFF';
  
  // Clone page content
  const clone = pageElement.cloneNode(true) as HTMLElement;
  
  // Add margin wrapper if needed
  if (withMargins) {
    const marginWrapper = document.createElement('div');
    marginWrapper.style.padding = `${Math.floor(marginMM * mmToPx)}px`;
    marginWrapper.style.width = '100%';
    marginWrapper.style.height = '100%';
    marginWrapper.style.boxSizing = 'border-box';
    marginWrapper.appendChild(clone);
    container.appendChild(marginWrapper);
  } else {
    container.appendChild(clone);
  }
  
  document.body.appendChild(container);
  
  // Wait for render
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Capture with html2canvas at 300 DPI
  const canvas = await html2canvas(container, {
    scale: 1,
    backgroundColor: '#FFFFFF',
    logging: false,
    useCORS: true,
    allowTaint: true,
  });
  
  // Convert to Uint8Array
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png');
  });
  
  document.body.removeChild(container);
  
  return new Uint8Array(await blob.arrayBuffer());
};

/**
 * Export a single place cards page to Word document
 * @param settings - Place card settings (not currently used but available for future customization)
 * @param guests - Array of guests (not currently used but available for future features)
 * @param event - Event details for file naming
 * @param pageIndex - Zero-based page index to export
 */
export const exportPlaceCardPageToDocx = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  pageIndex: number
): Promise<void> => {
  // Get the specific page element
  const pageElement = document.querySelector(`[data-page="${pageIndex}"]`) as HTMLElement;
  if (!pageElement) {
    throw new Error(`Page ${pageIndex} not found`);
  }
  
  // Convert to high-resolution image
  const imageBuffer = await convertPlaceCardPageToImage(pageElement, true);
  
  // Create Word document with A4 narrow margins
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 11906,  // 210mm in twentieths of a point
            height: 16838, // 297mm in twentieths of a point
          },
          margin: {
            top: 482,    // 1.27cm in twentieths of a point
            right: 482,
            bottom: 482,
            left: 482,
          },
        },
      },
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 703,  // 187.46mm (210 - 2*1.27) in points * 72/25.4
                height: 1031, // 274.46mm (297 - 2*1.27) in points * 72/25.4
              },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
  const fileName = `${sanitizedName}-Place-Cards-Page-${pageIndex + 1}.docx`;
  saveAs(blob, fileName);
};

/**
 * Export all place cards pages to a single multi-page Word document
 * @param settings - Place card settings (not currently used but available for future customization)
 * @param guests - Array of guests (not currently used but available for future features)
 * @param event - Event details for file naming
 * @param totalPages - Total number of pages to export
 */
export const exportAllPlaceCardsToDocx = async (
  settings: PlaceCardSettings | null,
  guests: Guest[],
  event: any,
  totalPages: number
): Promise<void> => {
  const sections = [];
  
  // Convert all pages to images
  for (let i = 0; i < totalPages; i++) {
    const pageElement = document.querySelector(`[data-page="${i}"]`) as HTMLElement;
    if (!pageElement) {
      console.warn(`Page ${i} not found, skipping`);
      continue;
    }
    
    const imageBuffer = await convertPlaceCardPageToImage(pageElement, true);
    
    sections.push({
      properties: {
        page: {
          size: {
            width: 11906,
            height: 16838,
          },
          margin: {
            top: 482,
            right: 482,
            bottom: 482,
            left: 482,
          },
        },
      },
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 703,
                height: 1031,
              },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });
  }
  
  // Create document with all sections
  const doc = new Document({ sections });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const sanitizedName = event.name.replace(/[^a-z0-9]/gi, '-');
  const fileName = `${sanitizedName}-Place-Cards-All.docx`;
  saveAs(blob, fileName);
};
