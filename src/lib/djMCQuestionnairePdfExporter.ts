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
 */
import jsPDF from 'jspdf';
import { DJMCQuestionnaire, DJMCSection, DJMCItem } from '@/types/djMCQuestionnaire';

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

// Format current timestamp
const formatGeneratedTimestamp = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Load logo image as base64
const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch('/wedding-waitress-share-logo.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo:', error);
    return null;
  }
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

// Draw a section table
const drawSectionTable = (
  pdf: jsPDF,
  section: DJMCSection,
  startY: number,
  pageWidth: number,
  margin: number,
  contentWidth: number
): number => {
  const config = getSectionColumnConfig(section.section_type);
  const rowHeight = 7;
  const headerHeight = 8;
  const fontSize = 9;
  let yPos = startY;

  // Section title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.text(section.section_label, margin, yPos);
  yPos += 5;

  // Section notes if present
  if (section.notes) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const noteLines = pdf.splitTextToSize(`Notes: ${section.notes}`, contentWidth);
    pdf.text(noteLines, margin, yPos);
    yPos += noteLines.length * 4 + 2;
  }

  // Draw header row
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPos, contentWidth, headerHeight, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 80);
  
  let xPos = margin + 2;
  config.headers.forEach((header, idx) => {
    const colWidth = contentWidth * config.widths[idx];
    const truncatedHeader = truncateText(pdf, header, colWidth - 4);
    pdf.text(truncatedHeader, xPos, yPos + 5);
    xPos += colWidth;
  });
  yPos += headerHeight;

  // Draw border under header
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPos, margin + contentWidth, yPos);

  // Draw item rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(fontSize);
  pdf.setTextColor(0, 0, 0);

  section.items.forEach((item, idx) => {
    // Alternate row background
    if (idx % 2 === 0) {
      pdf.setFillColor(252, 252, 252);
      pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
    }

    const cellValues = getItemCellValues(item, section.section_type);
    xPos = margin + 2;
    
    cellValues.forEach((value, colIdx) => {
      const colWidth = contentWidth * config.widths[colIdx];
      
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
    pdf.line(margin, yPos, margin + contentWidth, yPos);
  });

  return yPos + 8; // Add some spacing after the section
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

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);

  // Load logo
  const logoBase64 = await loadLogoAsBase64();

  let yPos = margin;

  // Header - Event Name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.text(event.name, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text('DJ-MC Questionnaire', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // Date and venue
  const dateVenueText = `${formatDateWithOrdinal(event.date)} | ${event.venue || 'Venue TBD'}`;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(dateVenueText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 3;

  // Draw border line
  pdf.setDrawColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Draw section table
  yPos = drawSectionTable(pdf, section, yPos, pageWidth, margin, contentWidth);

  // Footer with logo
  if (logoBase64) {
    const logoHeight = 10;
    const logoWidth = 35;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = pageHeight - margin - logoHeight;
    
    try {
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.error('Failed to add logo to PDF:', error);
    }
  }

  // Generated timestamp
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Generated: ${formatGeneratedTimestamp()}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

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

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);

  // Load logo
  const logoBase64 = await loadLogoAsBase64();

  let yPos = margin;
  let currentPage = 1;

  const addNewPage = () => {
    pdf.addPage();
    currentPage++;
    yPos = margin;
    
    // Add page header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
    pdf.text(`${event.name} - DJ-MC Questionnaire`, margin, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${currentPage}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
  };

  // First page header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.text(event.name, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Subtitle
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text('DJ-MC Questionnaire', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Event details
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  
  const receptionDate = formatDateWithOrdinal(event.date);
  const receptionVenue = event.venue || 'Venue TBD';
  const receptionTime = `${formatTimeDisplay(event.start_time)} - ${formatTimeDisplay(event.finish_time)}`;
  
  pdf.text(`Reception: ${receptionDate}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  pdf.text(`${receptionVenue} | ${receptionTime}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  if (event.ceremony_date) {
    const ceremonyDate = formatDateWithOrdinal(event.ceremony_date);
    const ceremonyVenue = event.ceremony_venue || 'Venue TBD';
    const ceremonyTime = `${formatTimeDisplay(event.ceremony_start_time)} - ${formatTimeDisplay(event.ceremony_finish_time)}`;
    
    pdf.text(`Ceremony: ${ceremonyDate}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    pdf.text(`${ceremonyVenue} | ${ceremonyTime}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  // Draw border line
  yPos += 2;
  pdf.setDrawColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Draw each section
  for (const section of questionnaire.sections) {
    // Estimate section height
    const estimatedHeight = 20 + (section.items.length * 7) + (section.notes ? 15 : 0);
    
    // Check if we need a new page
    if (yPos + estimatedHeight > pageHeight - 30) {
      addNewPage();
    }

    yPos = drawSectionTable(pdf, section, yPos, pageWidth, margin, contentWidth);
  }

  // Add logo to the last page footer
  if (logoBase64) {
    const logoHeight = 10;
    const logoWidth = 35;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = pageHeight - margin - logoHeight;
    
    try {
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.error('Failed to add logo to PDF:', error);
    }
  }

  // Generated timestamp
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Generated: ${formatGeneratedTimestamp()}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

  // Save PDF
  const eventName = event.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${eventName}-DJ-MC-Questionnaire-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
