/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 * Last locked: 2026-04-03
 */
import jsPDF from 'jspdf';
import { DJMCQuestionnaire, DJMCSection, DJMCItem } from '@/types/djMCQuestionnaire';
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';

interface Event {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
}

// Purple color for branding
const PURPLE = { r: 109, g: 40, b: 217 }; // #6D28D9

// --- Layout constants (mm) matching running sheet ---
const PDF_WIDTH_MM = 210;
const PDF_HEIGHT_MM = 297;
const FOOTER_ZONE_MM = 30;
const TOP_MARGIN_PAGE2_MM = 12;
const FOOTER_LOGO_HEIGHT_MM = 12;
const FOOTER_LOGO_WIDTH_MM = 42;
const FOOTER_TEXT_Y_MM = PDF_HEIGHT_MM - 5; // 5mm from bottom
const FOOTER_LOGO_Y_MM = FOOTER_TEXT_Y_MM - FOOTER_LOGO_HEIGHT_MM - 2;
const MARGIN = 15;
const CONTENT_WIDTH = PDF_WIDTH_MM - (2 * MARGIN);

// Format date with ordinal suffix
const formatDateWithOrdinal = (dateString: string | null | undefined): string => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDate();
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName} ${ordinal(day)}, ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

// Format time as "3:00 PM"
const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Format current timestamp with AM/PM
const formatGeneratedTimestamp = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${day}/${month}/${year} ${displayHour}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
};

// Load logo image as data URL for jsPDF
const loadLogoAsDataUrl = async (): Promise<string | null> => {
  try {
    const response = await fetch(weddingWaitressLogo);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Draw the footer on the current jsPDF page: white zone, logo, page number, generated timestamp.
 * Matches the running sheet footer exactly.
 */
const drawPageFooter = (
  pdf: jsPDF,
  logoDataUrl: string | null,
  pageNum: number,
  totalPages: number,
  timestamp: string
) => {
  // White rectangle to cover any bleeding content
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, PDF_HEIGHT_MM - FOOTER_ZONE_MM, PDF_WIDTH_MM, FOOTER_ZONE_MM, 'F');

  // Logo centered
  if (logoDataUrl) {
    const logoX = (PDF_WIDTH_MM - FOOTER_LOGO_WIDTH_MM) / 2;
    try {
      pdf.addImage(logoDataUrl, 'PNG', logoX, FOOTER_LOGO_Y_MM, FOOTER_LOGO_WIDTH_MM, FOOTER_LOGO_HEIGHT_MM);
    } catch {
      // silently skip if logo fails
    }
  }

  // Page number (left) and Generated timestamp (right)
  pdf.setFontSize(7);
  pdf.setTextColor(170, 170, 170);
  pdf.text(`Page ${pageNum} of ${totalPages}`, 12, FOOTER_TEXT_Y_MM);
  pdf.text(`Generated: ${timestamp}`, PDF_WIDTH_MM - 12, FOOTER_TEXT_Y_MM, { align: 'right' });
};

// Get column configuration based on section type
const getSectionColumnConfig = (sectionType: string): { headers: string[]; widths: number[] } => {
  switch (sectionType) {
    case 'ceremony':
      return {
        headers: ['Event', 'Names / Info', 'Song Title & Artist', 'Music Link'],
        widths: [0.2, 0.25, 0.3, 0.25]
      };
    case 'introductions':
      return {
        headers: ['Bridal Party Order', 'Names', 'Song Title & Artist', 'Music Link'],
        widths: [0.2, 0.25, 0.3, 0.25]
      };
    case 'traditional':
      return {
        headers: ['Song Number', 'Dedication / Details', 'Song Title & Artist', 'Music Link'],
        widths: [0.15, 0.3, 0.3, 0.25]
      };
    case 'speeches':
      return {
        headers: ['Speaker Status', 'Speaker Name', 'Time Allowed'],
        widths: [0.35, 0.45, 0.2]
      };
    case 'cocktail':
    case 'dinner':
    case 'dance':
    case 'main_event':
      return {
        headers: ['Song Number', 'Song Title & Artist', 'Music Link'],
        widths: [0.2, 0.45, 0.35]
      };
    case 'do_not_play':
      return {
        headers: ['Song Number', 'Song Name'],
        widths: [0.25, 0.75]
      };
    default:
      return {
        headers: ['Item', 'Details', 'Notes'],
        widths: [0.3, 0.4, 0.3]
      };
  }
};

// Get cell values for an item based on section type
const getItemCellValues = (item: DJMCItem, sectionType: string): string[] => {
  switch (sectionType) {
    case 'ceremony':
      return [
        item.row_label || '',
        item.value_text || '',
        item.song_title_artist || '',
        item.music_url || ''
      ];
    case 'introductions':
      return [
        item.row_label || '',
        item.value_text || '',
        item.song_title_artist || '',
        item.music_url || ''
      ];
    case 'traditional':
      return [
        item.row_label || '',
        item.value_text || '',
        item.song_title_artist || '',
        item.music_url || ''
      ];
    case 'speeches':
      return [
        item.row_label || '',
        item.value_text || '',
        item.duration || ''
      ];
    case 'cocktail':
    case 'dinner':
    case 'dance':
    case 'main_event':
      return [
        item.row_label || '',
        item.song_title_artist || '',
        item.music_url || ''
      ];
    case 'do_not_play':
      return [
        item.row_label || '',
        item.value_text || ''
      ];
    default:
      return [
        item.row_label || '',
        item.value_text || '',
        ''
      ];
  }
};

// Truncate text to fit within a given width
const truncateText = (pdf: jsPDF, text: string, maxWidth: number): string => {
  if (!text) return '';
  let truncated = text;
  while (pdf.getTextWidth(truncated) > maxWidth && truncated.length > 3) {
    truncated = truncated.slice(0, -4) + '...';
  }
  return truncated;
};

// Usable content height (excluding footer zone)
const usableHeightPage1 = PDF_HEIGHT_MM - FOOTER_ZONE_MM;
const usableHeightPage2Plus = PDF_HEIGHT_MM - FOOTER_ZONE_MM - TOP_MARGIN_PAGE2_MM;

// Draw a section table (returns new yPos)
const drawSectionTable = (
  pdf: jsPDF,
  section: DJMCSection,
  startY: number,
  addNewPage: () => void,
  getYPos: () => number,
  isFirstPage: () => boolean
): number => {
  const config = getSectionColumnConfig(section.section_type);
  const rowHeight = 7;
  const headerHeight = 8;
  const fontSize = 9;
  let yPos = startY;

  const getUsableBottom = () => isFirstPage() ? usableHeightPage1 : usableHeightPage2Plus + TOP_MARGIN_PAGE2_MM;

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > getUsableBottom()) {
      addNewPage();
      yPos = getYPos();
    }
  };

  // Section title
  checkPageBreak(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.text(section.section_label, MARGIN, yPos);
  yPos += 5;

  // Section notes if present
  if (section.notes) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const noteLines = pdf.splitTextToSize(`Notes: ${section.notes}`, CONTENT_WIDTH);
    checkPageBreak(noteLines.length * 4 + 2);
    pdf.text(noteLines, MARGIN, yPos);
    yPos += noteLines.length * 4 + 2;
  }

  // Draw header row
  checkPageBreak(headerHeight + 2);
  pdf.setFillColor(245, 245, 245);
  pdf.rect(MARGIN, yPos, CONTENT_WIDTH, headerHeight, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 80);
  
  let xPos = MARGIN + 2;
  config.headers.forEach((header, idx) => {
    const colWidth = CONTENT_WIDTH * config.widths[idx];
    const truncatedHeader = truncateText(pdf, header, colWidth - 4);
    pdf.text(truncatedHeader, xPos, yPos + 5);
    xPos += colWidth;
  });
  yPos += headerHeight;

  // Draw border under header
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, yPos, MARGIN + CONTENT_WIDTH, yPos);

  // Draw item rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(fontSize);
  pdf.setTextColor(0, 0, 0);

  section.items.forEach((item, idx) => {
    checkPageBreak(rowHeight + 1);

    // Alternate row background
    if (idx % 2 === 0) {
      pdf.setFillColor(252, 252, 252);
      pdf.rect(MARGIN, yPos, CONTENT_WIDTH, rowHeight, 'F');
    }

    const cellValues = getItemCellValues(item, section.section_type);
    xPos = MARGIN + 2;
    
    cellValues.forEach((value, colIdx) => {
      const colWidth = CONTENT_WIDTH * config.widths[colIdx];
      
      // Check if this is a music URL column (last column for sections with music links)
      const isMusicUrlColumn = 
        (section.section_type !== 'speeches' && section.section_type !== 'do_not_play') && 
        colIdx === cellValues.length - 1 && 
        value && 
        (value.startsWith('http://') || value.startsWith('https://'));
      
      if (isMusicUrlColumn && value) {
        // Render as clickable link
        const displayText = truncateText(pdf, 'Click to open', colWidth - 4);
        pdf.setTextColor(109, 40, 217); // Purple color for links
        pdf.textWithLink(displayText, xPos, yPos + 5, { url: value });
        pdf.setTextColor(0, 0, 0); // Reset to black
      } else {
        const truncatedValue = truncateText(pdf, value, colWidth - 4);
        pdf.text(truncatedValue, xPos, yPos + 5);
      }
      xPos += colWidth;
    });

    yPos += rowHeight;

    // Draw light border between rows
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.1);
    pdf.line(MARGIN, yPos, MARGIN + CONTENT_WIDTH, yPos);
  });

  return yPos + 8; // Add some spacing after the section
};

/**
 * Draw the header matching the running sheet layout:
 * - Large purple event name
 * - "DJ-MC Questionnaire" subtitle
 * - Ceremony line (if exists)
 * - Reception line
 * - Purple divider
 */
const drawHeader = (pdf: jsPDF, event: Event): number => {
  let yPos = MARGIN;

  // Event name - large purple
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.text(event.name, PDF_WIDTH_MM / 2, yPos, { align: 'center' });
  yPos += 6;

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(34, 34, 34);
  pdf.text('DJ-MC Questionnaire', PDF_WIDTH_MM / 2, yPos, { align: 'center' });
  yPos += 5;

  // Event details - matching running sheet format
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(85, 85, 85);

  if (event.ceremony_date) {
    const ceremonyDate = formatDateWithOrdinal(event.ceremony_date);
    const ceremonyVenue = event.ceremony_venue || 'Venue TBD';
    const ceremonyTime = `${formatTimeDisplay(event.ceremony_start_time)} – ${formatTimeDisplay(event.ceremony_finish_time)}`;
    pdf.text(`Ceremony: ${ceremonyDate} | ${ceremonyVenue} | ${ceremonyTime}`, PDF_WIDTH_MM / 2, yPos, { align: 'center' });
    yPos += 5;
  }

  const receptionDate = formatDateWithOrdinal(event.date);
  const receptionVenue = event.venue || 'Venue TBD';
  const receptionTime = `${formatTimeDisplay(event.start_time)} – ${formatTimeDisplay(event.finish_time)}`;
  pdf.text(`Reception: ${receptionDate} | ${receptionVenue} | ${receptionTime}`, PDF_WIDTH_MM / 2, yPos, { align: 'center' });
  yPos += 5;

  // Purple divider
  yPos += 2;
  pdf.setDrawColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, yPos, PDF_WIDTH_MM - MARGIN, yPos);
  yPos += 10;

  return yPos;
};

// Export a single section to PDF
export const exportSectionPDF = async (
  section: DJMCSection,
  event: Event
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoDataUrl = await loadLogoAsDataUrl();
  const timestamp = formatGeneratedTimestamp();

  let currentPage = 1;
  let onFirstPage = true;

  // Draw header on first page
  let yPos = drawHeader(pdf, event);

  const addNewPage = () => {
    pdf.addPage();
    currentPage++;
    onFirstPage = false;
    yPos = TOP_MARGIN_PAGE2_MM;
  };

  // Draw section table
  yPos = drawSectionTable(pdf, section, yPos, addNewPage, () => yPos, () => onFirstPage);

  // Stamp footers on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawPageFooter(pdf, logoDataUrl, i, totalPages, timestamp);
  }

  // Save PDF
  const safeEventName = event.name.replace(/[\\/:*?"<>|]/g, '');
  const safeSectionName = section.section_label.replace(/[\\/:*?"<>|]/g, '');
  const dateObj = event.date ? new Date(event.date + 'T00:00:00') : new Date();
  const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
  const fileName = `${safeEventName}-${safeSectionName}-${formattedDate}.pdf`;
  pdf.save(fileName);
};

// Export entire questionnaire to PDF
export const exportEntireQuestionnairePDF = async (
  questionnaire: DJMCQuestionnaire,
  event: Event
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoDataUrl = await loadLogoAsDataUrl();
  const timestamp = formatGeneratedTimestamp();

  let currentPage = 1;
  let onFirstPage = true;

  // Draw header on first page
  let yPos = drawHeader(pdf, event);

  const addNewPage = () => {
    pdf.addPage();
    currentPage++;
    onFirstPage = false;
    yPos = TOP_MARGIN_PAGE2_MM;
  };

  // Draw each section
  for (const section of questionnaire.sections) {
    // Estimate section height
    const estimatedHeight = 20 + (section.items.length * 7) + (section.notes ? 15 : 0);
    const usableBottom = onFirstPage ? usableHeightPage1 : usableHeightPage2Plus + TOP_MARGIN_PAGE2_MM;
    
    // Check if we need a new page
    if (yPos + estimatedHeight > usableBottom) {
      addNewPage();
    }

    yPos = drawSectionTable(pdf, section, yPos, addNewPage, () => yPos, () => onFirstPage);
  }

  // Stamp footers on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawPageFooter(pdf, logoDataUrl, i, totalPages, timestamp);
  }

  // Save PDF
  const safeEventName = event.name.replace(/[\\/:*?"<>|]/g, '');
  const dateObj = event.date ? new Date(event.date + 'T00:00:00') : new Date();
  const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
  const fileName = `${safeEventName}-DJ-MC Questionnaire-${formattedDate}.pdf`;
  pdf.save(fileName);
};
