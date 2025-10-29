import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { RunningSheet, RunningSheetItem } from '@/types/runningSheet';

const PURPLE_ACCENT = '#6D28D9';
const RED_EMPHASIS = '#D92D20';

export const exportRunningSheetToPdf = async (
  event: any,
  sheet: RunningSheet,
  items: RunningSheetItem[]
) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 8;
  const marginRight = 8;
  const marginTop = 12;
  const marginBottom = 12;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let currentPage = 1;
  let y = marginTop;

  // Apply user settings
  const fontSizeMap = { small: 9, medium: 10.5, large: 12 }; // Convert pt to PDF points
  const textFontSize = fontSizeMap[sheet.all_text_size || 'medium'];
  const headerFontSize = fontSizeMap[sheet.header_size || 'large'];
  const textFont = sheet.all_font || 'helvetica';
  const headerFont = sheet.header_font || 'helvetica';
  const textColor = sheet.all_text_color || '#000000';
  const headerColorHex = sheet.header_color || '#6D28D9';

  // Load Wedding Waitress logo
  const logoImg = await loadLogo();

  const addHeader = (pageNum: number) => {
    y = marginTop;

    // Line 1: Event Name (center, bold, purple)
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(PURPLE_ACCENT);
    const eventName = event.name || 'Event';
    pdf.text(eventName, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Line 2: Running Sheet - Date
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#000000');
    const eventDate = event.date ? format(new Date(event.date), 'EEEE do MMMM yyyy') : '';
    pdf.text(`Running Sheet – ${eventDate}`, pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Line 3: Venue, Total Items, Page X of Y, Generated
    pdf.setFontSize(9);
    const venueName = event.venue || 'Venue';
    const totalItems = items.length;
    const totalPages = Math.ceil(items.length / 15); // Estimate
    const generatedDate = format(new Date(), 'dd/MM/yy');
    const generatedTime = format(new Date(), 'h:mm a');
    const line3 = `${venueName} – Total Items: ${totalItems} – Page ${pageNum} of ${totalPages} – Generated on: ${generatedDate} – Time: ${generatedTime}`;
    pdf.text(line3, pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Divider line
    pdf.setDrawColor('#CCCCCC');
    pdf.line(marginLeft, y, pageWidth - marginRight, y);
    y += 8;
  };

  const addFooter = () => {
    // Wedding Waitress logo at bottom center
    if (logoImg) {
      const logoWidth = 40;
      const logoHeight = 12;
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = pageHeight - marginBottom - logoHeight - 5;
      pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
    }
  };

  // Add first page header
  addHeader(currentPage);

  // Column widths
  const timeWidth = 20;
  const descWidth = sheet.show_responsible ? 120 : 160;
  const respWidth = 40;

  // Add items
  items.forEach((item, index) => {
    // Check if we need a new page
    const itemHeight = item.is_section_header ? 12 : 20;
    if (y + itemHeight > pageHeight - marginBottom - 20) {
      addFooter();
      pdf.addPage();
      currentPage++;
      addHeader(currentPage);
    }

    if (item.is_section_header) {
      // Section header
      pdf.setFillColor('#F4F4F5');
      pdf.rect(marginLeft, y - 4, contentWidth, 10, 'F');
      pdf.setFontSize(headerFontSize);
      const headerFontStyle = (sheet.header_bold !== false ? 'bold' : '') + (sheet.header_italic ? 'italic' : 'normal');
      pdf.setFont(headerFont.toLowerCase().replace(/\s+/g, ''), headerFontStyle || 'bold');
      pdf.setTextColor(headerColorHex);
      const text = typeof item.description_rich === 'object' && item.description_rich.text
        ? item.description_rich.text
        : item.description_rich || '';
      pdf.text(text, marginLeft + 2, y + 2);
      y += 12;
    } else {
      // Regular row
      pdf.setFontSize(textFontSize);
      const baseFontStyle = (sheet.all_bold ? 'bold' : '') + (sheet.all_italic ? 'italic' : 'normal');
      pdf.setFont(textFont.toLowerCase().replace(/\s+/g, ''), baseFontStyle || 'normal');

      // Time
      pdf.setTextColor(textColor);
      pdf.text(item.time_text || '', marginLeft, y);

      // Description
      const descX = marginLeft + timeWidth + 2;
      const descText = typeof item.description_rich === 'object' && item.description_rich.text
        ? item.description_rich.text
        : item.description_rich || '';
      
      // Check formatting
      const formatting = typeof item.description_rich === 'object' && item.description_rich.formatting
        ? item.description_rich.formatting
        : {};

      const descFontStyle = ((formatting.bold || sheet.all_bold) ? 'bold' : '') + 
                           ((formatting.italic || sheet.all_italic) ? 'italic' : 'normal');
      pdf.setFont(textFont.toLowerCase().replace(/\s+/g, ''), descFontStyle || 'normal');
      if (formatting.red) {
        pdf.setTextColor(RED_EMPHASIS);
      } else {
        pdf.setTextColor(textColor);
      }

      const descLines = pdf.splitTextToSize(descText, descWidth);
      pdf.text(descLines, descX, y);

      // Reset formatting
      pdf.setFont(textFont.toLowerCase().replace(/\s+/g, ''), baseFontStyle || 'normal');
      pdf.setTextColor(textColor);

      // Responsible
      if (sheet.show_responsible) {
        const respX = marginLeft + timeWidth + descWidth + 4;
        pdf.text(item.responsible || '', respX, y);
      }

      y += Math.max(descLines.length * 5, 10);
    }
  });

  // Add footer to last page
  addFooter();

  // Save PDF
  const fileName = `${event.name}-Running-Sheet-${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
};

const loadLogo = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/wedding-waitress-pdf-footer-logo.png';
  });
};
