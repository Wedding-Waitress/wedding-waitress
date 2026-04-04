import jsPDF from 'jspdf';
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';

interface Guest {
  id: string;
  first_name: string;
  last_name: string | null;
  table_id: string | null;
  table_no: number | null;
  dietary: string | null;
  relation_display: string | null;
  relation_role?: string;
}

interface FullSeatingChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo';
  fontSize: 'small' | 'medium' | 'large';
  showDietary: boolean;
  showRsvp: boolean;
  showRelation: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  start_time?: string | null;
  finish_time?: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
}

// Layout constants matching Running Sheet
const PDF_WIDTH_MM = 210;
const PDF_HEIGHT_MM = 297;
const FOOTER_ZONE_MM = 25;
const FOOTER_LOGO_HEIGHT_MM = 12;
const FOOTER_LOGO_WIDTH_MM = 42;
const FOOTER_TEXT_Y_MM = PDF_HEIGHT_MM - 3;
const FOOTER_LOGO_Y_MM = FOOTER_TEXT_Y_MM - FOOTER_LOGO_HEIGHT_MM - 2;

// Convert font size setting to points
const getFontSize = (setting: 'small' | 'medium' | 'large'): number => {
  switch (setting) {
    case 'small': return 10.5;
    case 'medium': return 12;
    case 'large': return 13.5;
  }
};

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

// Format time to 12-hour AM/PM
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
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${displayHour}:${minutes} ${ampm}`;
};

// Format guest name - full name
const formatGuestName = (guest: Guest): string => {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
};

// Format table assignment using name maps
const formatTableAssignment = (guest: Guest, tableNameMap?: Record<number, string>, tableIdNameMap?: Record<string, string>): string => {
  if (guest.table_no) {
    if (tableNameMap && tableNameMap[guest.table_no]) return tableNameMap[guest.table_no];
    return `Table ${guest.table_no}`;
  }
  if (guest.table_id && tableIdNameMap && tableIdNameMap[guest.table_id]) return tableIdNameMap[guest.table_id];
  return 'Unassigned';
};

const isGuestUnassigned = (guest: Guest): boolean => !guest.table_no && !guest.table_id;

// Load logo image as base64
const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch(weddingWaitressLogo);
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

// Draw footer matching Running Sheet style
const drawPageFooter = (
  pdf: jsPDF,
  logoBase64: string | null,
  pageNum: number,
  totalPages: number,
  timestamp: string,
  showLogo: boolean
) => {
  // White rectangle to cover any bleeding content
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, PDF_HEIGHT_MM - FOOTER_ZONE_MM, PDF_WIDTH_MM, FOOTER_ZONE_MM, 'F');

  // Logo centered
  if (showLogo && logoBase64) {
    const logoX = (PDF_WIDTH_MM - FOOTER_LOGO_WIDTH_MM) / 2;
    try {
      pdf.addImage(logoBase64, 'PNG', logoX, FOOTER_LOGO_Y_MM, FOOTER_LOGO_WIDTH_MM, FOOTER_LOGO_HEIGHT_MM);
    } catch {
      // silently skip
    }
  }

  // Page number (left) and Generated timestamp (right)
  pdf.setFontSize(7);
  pdf.setTextColor(170, 170, 170);
  pdf.text(`Page ${pageNum} of ${totalPages}`, 12, FOOTER_TEXT_Y_MM);
  pdf.text(`Generated: ${timestamp}`, PDF_WIDTH_MM - 12, FOOTER_TEXT_Y_MM, { align: 'right' });
};

export const exportFullSeatingChartToPdf = async (
  event: Event,
  guests: Guest[],
  settings: FullSeatingChartSettings,
  pageNum?: number,
  totalPagesOverride?: number,
  tableNameMap?: Record<number, string>,
  tableIdNameMap?: Record<string, string>
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 12.7;
  const contentWidth = PDF_WIDTH_MM - (2 * margin);
  
  const baseRowHeight: Record<string, number> = {
    'small': 8.4,   // 294/8.4 = 35 guests per column
    'medium': 11,
    'large': 13
  };
  
  const rowHeight = baseRowHeight[settings.fontSize] || 11;
  // Always 35 per column since metadata is now inline in brackets
  const availableHeight = 294;
  
  const calculatedGuestsPerColumn = Math.floor(availableHeight / rowHeight);
  const guestsPerColumn = Math.max(1, calculatedGuestsPerColumn);
  const guestsPerPage = guestsPerColumn * 2;
  
  const totalPages = totalPagesOverride || Math.ceil(guests.length / guestsPerPage);
  const fontSize = getFontSize(settings.fontSize);
  const timestamp = formatGeneratedTimestamp();

  // Load logo
  let logoBase64: string | null = null;
  if (settings.showLogo) {
    logoBase64 = await loadLogoAsBase64();
  }

  const purple = { r: 109, g: 40, b: 217 };

  const startPage = pageNum || 1;
  const endPage = pageNum || totalPages;

  for (let currentPageNum = startPage; currentPageNum <= endPage; currentPageNum++) {
    if (currentPageNum > startPage) pdf.addPage();

    const startIdx = (currentPageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    const col1Guests = pageGuests.slice(0, guestsPerColumn);
    const col2Guests = pageGuests.slice(guestsPerColumn);

    let yPos = margin;

    // Header - Event Name (22px equivalent ~16pt, bold, purple)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(purple.r, purple.g, purple.b);
    pdf.text(event.name, PDF_WIDTH_MM / 2, yPos, { align: 'center' });
    yPos += 6;

    // Subtitle - "Full Seating Chart - Total Guests: X" (normal weight, 12pt)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Full Seating Chart - Total Guests: ${guests.length}`, PDF_WIDTH_MM / 2, yPos, { align: 'center' });
    yPos += 5;

    // Ceremony info line (if available)
    pdf.setFontSize(9);
    pdf.setTextColor(85, 85, 85);
    if (event.ceremony_date) {
      const ceremonyLine = `Ceremony: ${formatDateWithOrdinal(event.ceremony_date)} | ${event.ceremony_venue || 'Venue TBD'} | ${formatTimeDisplay(event.ceremony_start_time)} – ${formatTimeDisplay(event.ceremony_finish_time)}`;
      pdf.text(ceremonyLine, PDF_WIDTH_MM / 2, yPos, { align: 'center' });
      yPos += 4;
    }

    // Reception info line
    const receptionLine = `Reception: ${formatDateWithOrdinal(event.date)} | ${event.venue || 'Venue TBD'} | ${formatTimeDisplay(event.start_time)} – ${formatTimeDisplay(event.finish_time)}`;
    pdf.text(receptionLine, PDF_WIDTH_MM / 2, yPos, { align: 'center' });
    yPos += 4;

    // Purple divider line (matching Running Sheet)
    pdf.setDrawColor(purple.r, purple.g, purple.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, PDF_WIDTH_MM - margin, yPos);
    yPos += 2;

    // Column calculations
    const columnWidth = (contentWidth - 12) / 2;
    const leftColumnX = margin;
    const rightColumnX = margin + columnWidth + 12;

    const col1Start = startIdx + 1;
    const col1End = startIdx + col1Guests.length;
    const col2Start = startIdx + col1Guests.length + 1;
    const col2End = endIdx;

    // Column headers bar (gray background, matching Running Sheet style)
    const headerBarHeight = 6;
    const headerBarY = yPos;
    pdf.setFillColor(243, 243, 243); // #f3f3f3
    pdf.rect(margin, headerBarY, contentWidth, headerBarHeight, 'F');
    // Bottom border of header bar
    pdf.setDrawColor(204, 204, 204); // #ccc
    pdf.setLineWidth(0.5);
    pdf.line(margin, headerBarY + headerBarHeight, PDF_WIDTH_MM - margin, headerBarY + headerBarHeight);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0); // black
    pdf.text(`GUESTS ${col1Start}-${col1End}`, leftColumnX + 2, headerBarY + 4);
    pdf.text('TABLE', leftColumnX + columnWidth - pdf.getTextWidth('TABLE'), headerBarY + 4);
    if (col2Guests.length > 0) {
      pdf.text(`GUESTS ${col2Start}-${col2End}`, rightColumnX + 2, headerBarY + 4);
      pdf.text('TABLE', rightColumnX + columnWidth - pdf.getTextWidth('TABLE'), headerBarY + 4);
    }
    // Small gap after header bar (3mm) matching the preview paddingTop
    yPos = headerBarY + headerBarHeight + 3;

    // Draw guests
    const maxRows = Math.max(col1Guests.length, col2Guests.length);
    
    for (let i = 0; i < maxRows; i++) {
      const guest1 = col1Guests[i];
      const guest2 = col2Guests[i];

      // Each guest row occupies [yPos .. yPos + rowHeight]
      // Name text baseline is at yPos + 3.5mm (vertically centered in top portion)
      const nameBaselineY = yPos + 3.5;
      
      const drawGuest = (guest: Guest | undefined, xPos: number, baselineY: number) => {
        if (!guest) return;

        const hasDietary = settings.showDietary && guest.dietary && guest.dietary !== 'NA' && guest.dietary.toLowerCase() !== 'none';
        const hasRelation = settings.showRelation && guest.relation_display;

        // Purple circle checkbox - vertically aligned with name
        pdf.setDrawColor(purple.r, purple.g, purple.b);
        pdf.setLineWidth(0.4);
        pdf.circle(xPos + 1.5, baselineY - 1.2, 1.5, 'S');
        
        // Guest name - apply text style settings
        const fontStyle = settings.isBold && settings.isItalic ? 'bolditalic' 
          : settings.isBold ? 'bold' 
          : settings.isItalic ? 'italic' 
          : 'normal';
        pdf.setFont('helvetica', fontStyle);
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0, 0, 0);
        const guestName = formatGuestName(guest);
        pdf.text(guestName, xPos + 5, baselineY);
        
        // Underline for guest name
        if (settings.isUnderline) {
          const nameWidth = pdf.getTextWidth(guestName);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.2);
          pdf.line(xPos + 5, baselineY + 0.5, xPos + 5 + nameWidth, baselineY + 0.5);
        }
        
        // Table assignment (right-aligned)
        const tableText = formatTableAssignment(guest, tableNameMap, tableIdNameMap);
        pdf.setFont('helvetica', fontStyle);
        pdf.setFontSize(fontSize);
        if (isGuestUnassigned(guest)) {
          pdf.setTextColor(147, 51, 234); // purple for unassigned
        } else {
          pdf.setTextColor(0, 0, 0); // black for assigned
        }
        const tableWidth = pdf.getTextWidth(tableText);
        const tableX = xPos + columnWidth - tableWidth;
        pdf.text(tableText, tableX, baselineY);
        
        // Underline for table text
        if (settings.isUnderline) {
          pdf.setDrawColor(!guest.table_no ? 147 : 0, !guest.table_no ? 51 : 0, !guest.table_no ? 234 : 0);
          pdf.setLineWidth(0.2);
          pdf.line(tableX, baselineY + 0.5, tableX + tableWidth, baselineY + 0.5);
        }
        
        pdf.setTextColor(0, 0, 0);
        
        // Info line (dietary/relation) below name
        const capitalizeWords = (t: string) => t.replace(/\b\w/g, c => c.toUpperCase());
        const infoParts: string[] = [];
        if (hasDietary) infoParts.push(capitalizeWords(guest.dietary!));
        if (hasRelation) infoParts.push(capitalizeWords(guest.relation_role || ''));
        const inlineInfo = infoParts.join(' / ');
        
        if (inlineInfo) {
          const line2Y = baselineY + (fontSize * 0.35);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(102, 102, 102);
          
          const maxInfoWidth = columnWidth - 10;
          let truncatedInfo = inlineInfo;
          while (pdf.getTextWidth(truncatedInfo) > maxInfoWidth && truncatedInfo.length > 3) {
            truncatedInfo = truncatedInfo.slice(0, -4) + '...';
          }
          pdf.text(truncatedInfo, xPos + 5, line2Y);
        }
      };

      drawGuest(guest1, leftColumnX, nameBaselineY);
      drawGuest(guest2, rightColumnX, nameBaselineY);
      
      // Row border at the bottom of this row
      const borderY = yPos + rowHeight - 0.5;
      pdf.setDrawColor(229, 229, 229);
      pdf.setLineWidth(0.3);
      if (guest1) pdf.line(leftColumnX, borderY, leftColumnX + columnWidth, borderY);
      if (guest2) pdf.line(rightColumnX, borderY, rightColumnX + columnWidth, borderY);
      
      // Move to next row
      yPos += rowHeight;
    }

    // Draw footer (logo centered, page left, generated right)
    drawPageFooter(pdf, logoBase64, currentPageNum, totalPages, timestamp, settings.showLogo);
  }

  // Save PDF
  const eventDate = event.date ? new Date(event.date + 'T00:00:00') : new Date();
  const dd = String(eventDate.getDate()).padStart(2, '0');
  const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
  const yyyy = eventDate.getFullYear();
  const formattedDate = `${dd}-${mm}-${yyyy}`;
  const pageLabel = pageNum ? 'Single Page' : 'All Pages';
  const safeName = event.name.replace(/[\/:*?"<>|]/g, '');
  const fileName = `${safeName}-Full Seating Chart-${pageLabel}-${formattedDate}.pdf`;
  pdf.save(fileName);
};
