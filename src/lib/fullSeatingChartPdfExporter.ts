import jsPDF from 'jspdf';
import {
  PAGE_WIDTH_MM, PAGE_HEIGHT_MM, MARGIN_LEFT_MM, MARGIN_TOP_MM,
  HEADER_HEIGHT_MM, CONTENT_START_MM, CONTENT_HEIGHT_MM, COLUMN_GAP_MM,
  COLUMN_WIDTH_MM,
  CONTENT_WIDTH_MM, FOOTER_LOGO_HEIGHT_MM, FOOTER_LOGO_WIDTH_MM,
  FOOTER_META_Y_MM, FOOTER_LOGO_Y_MM, FOOTER_START_MM,
  getFullSeatingChartGuestsPerColumn, getFullSeatingChartGuestsPerPage,
  getFullSeatingChartRowHeightMm, paginateGuests,
} from '@/lib/fullSeatingChartLayout';
import { PDF_DEFAULT_OPTIONS, savePdfAsync, yieldToBrowser } from '@/lib/pdfExportUtils';
import { FULL_SEATING_CHART_GUEST_TEXT_SIZES, FullSeatingChartColor, FullSeatingChartGuestTextSize, getFullSeatingChartGuestDetails } from '@/lib/fullSeatingChartDisplaySettings';

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
  fontSize: FullSeatingChartGuestTextSize;
  showDietary: boolean;
  showGuestNames: boolean;
  showSeatNumbers: boolean;
  showGuestList: boolean;
  showRsvp: boolean;
  showRelation: boolean;
  guestNameColor: FullSeatingChartColor;
  seatNumberColor: FullSeatingChartColor;
  guestListColor: FullSeatingChartColor;
  dietaryColor: FullSeatingChartColor;
  relationshipColor: FullSeatingChartColor;
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

// One CSS pixel at 96 DPI, matching the live preview's 1px row divider.
export const FULL_SEATING_CHART_PDF_ROW_BORDER_WIDTH_MM = 0.264583;
export const FULL_SEATING_CHART_PDF_FOOTER_MASK_START_MM =
  FOOTER_START_MM + FULL_SEATING_CHART_PDF_ROW_BORDER_WIDTH_MM;

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

const hexToRgb = (hex: FullSeatingChartColor) => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

// Load logo image as base64
const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch('/wedding-waitress-logo-brown.png');
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

// Draw footer at fixed position
const drawPageFooter = (
  pdf: jsPDF,
  logoBase64: string | null,
  pageNum: number,
  totalPages: number,
  timestamp: string,
  showLogo: boolean
) => {
  // Start below the final row stroke. A full 25-row column closes exactly at
  // FOOTER_START_MM, so masking from that same coordinate erases its border.
  pdf.setFillColor(255, 255, 255);
  pdf.rect(
    0,
    FULL_SEATING_CHART_PDF_FOOTER_MASK_START_MM,
    PAGE_WIDTH_MM,
    PAGE_HEIGHT_MM - FULL_SEATING_CHART_PDF_FOOTER_MASK_START_MM,
    'F',
  );

  // Logo centered within the approved three-column footer.
  if (showLogo && logoBase64) {
    const logoWidth = 36;
    const logoHeight = 10;
    const logoX = (PAGE_WIDTH_MM - logoWidth) / 2;
    const logoY = PAGE_HEIGHT_MM - 10 - 1 - logoHeight;
    try {
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch {
      // silently skip
    }
  }

  const footerBaselineY = PAGE_HEIGHT_MM - 10 - 6 + 1;
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Generated: ${timestamp}`, 12.7, footerBaselineY);
  pdf.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH_MM - 12.7, footerBaselineY, { align: 'right' });
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
    format: 'a4',
    ...PDF_DEFAULT_OPTIONS,
  });

  const margin = MARGIN_LEFT_MM;
  const contentWidth = CONTENT_WIDTH_MM;
  const rowHeight = getFullSeatingChartRowHeightMm(settings.fontSize);
  const guestsPerColumn = getFullSeatingChartGuestsPerColumn(settings.fontSize);
  const guestsPerPage = getFullSeatingChartGuestsPerPage(settings.fontSize);
  
  const pages = paginateGuests(guests, settings.fontSize);
  const totalPages = totalPagesOverride || pages.length;
  const fontSize = FULL_SEATING_CHART_GUEST_TEXT_SIZES[settings.fontSize];
  const timestamp = formatGeneratedTimestamp();

  // Load logo
  let logoBase64: string | null = null;
  if (settings.showLogo) {
    logoBase64 = await loadLogoAsBase64();
  }

  const black = { r: 0, g: 0, b: 0 };

  const startPage = pageNum || 1;
  const endPage = pageNum || totalPages;

  for (let currentPageNum = startPage; currentPageNum <= endPage; currentPageNum++) {
    if (currentPageNum > startPage) {
      pdf.addPage();
      // Yield between pages so the UI stays responsive on large exports.
      await yieldToBrowser();
    }

    const startIdx = (currentPageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    const col1Guests = pageGuests.slice(0, guestsPerColumn);
    const col2Guests = pageGuests.slice(guestsPerColumn);

    // ── ZONE 1: HEADER (fixed Y positions) ──
    let yPos = MARGIN_TOP_MM;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(black.r, black.g, black.b);
    pdf.text(event.name, PAGE_WIDTH_MM / 2, yPos, { align: 'center' });
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Full Seating Chart - Total Guests: ${guests.length}`, PAGE_WIDTH_MM / 2, yPos, { align: 'center' });
    yPos += 5;

    pdf.setFontSize(9);
    pdf.setTextColor(black.r, black.g, black.b);
    if (event.ceremony_date) {
      const ceremonyLine = `Ceremony: ${formatDateWithOrdinal(event.ceremony_date)} | ${event.ceremony_venue || 'Venue TBD'} | ${formatTimeDisplay(event.ceremony_start_time)} – ${formatTimeDisplay(event.ceremony_finish_time)}`;
      pdf.text(ceremonyLine, PAGE_WIDTH_MM / 2, yPos, { align: 'center' });
      yPos += 4;
    }

    const receptionLine = `Reception: ${formatDateWithOrdinal(event.date)} | ${event.venue || 'Venue TBD'} | ${formatTimeDisplay(event.start_time)} – ${formatTimeDisplay(event.finish_time)}`;
    pdf.text(receptionLine, PAGE_WIDTH_MM / 2, yPos, { align: 'center' });
    yPos += 4;

    pdf.setDrawColor(black.r, black.g, black.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, PAGE_WIDTH_MM - margin, yPos);
    yPos += 2;

    // Column calculations
    const columnWidth = COLUMN_WIDTH_MM;
    const leftColumnX = margin;
    const rightColumnX = margin + columnWidth + COLUMN_GAP_MM;

    const col1Start = startIdx + 1;
    const col1End = startIdx + col1Guests.length;
    const col2Start = startIdx + col1Guests.length + 1;
    const col2End = endIdx;

    // Column headers bar
    const headerBarHeight = 6;
    const headerBarY = yPos;
    pdf.setFillColor(243, 243, 243);
    pdf.rect(margin, headerBarY, contentWidth, headerBarHeight, 'F');
    pdf.setDrawColor(black.r, black.g, black.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, headerBarY + headerBarHeight, PAGE_WIDTH_MM - margin, headerBarY + headerBarHeight);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`GUESTS ${col1Start}-${col1End}`, leftColumnX + 2, headerBarY + 4);
    pdf.text('TABLE', leftColumnX + columnWidth - pdf.getTextWidth('TABLE'), headerBarY + 4);
    if (col2Guests.length > 0) {
      pdf.text(`GUESTS ${col2Start}-${col2End}`, rightColumnX + 2, headerBarY + 4);
      pdf.text('TABLE', rightColumnX + columnWidth - pdf.getTextWidth('TABLE'), headerBarY + 4);
    }

    // ── ZONE 2: CONTENT (starts at fixed CONTENT_START_MM) ──
    yPos = CONTENT_START_MM;

    // Draw guests
    const maxRows = Math.max(col1Guests.length, col2Guests.length);
    
    for (let i = 0; i < maxRows; i++) {
      const guest1 = col1Guests[i];
      const guest2 = col2Guests[i];

      // Each guest row occupies [yPos .. yPos + rowHeight]
      // Name text baseline vertically centered in compact row
      const nameBaselineY = yPos + (rowHeight / 2) + (fontSize * 0.352778 * 0.35);
      
      const drawGuest = (guest: Guest | undefined, xPos: number, baselineY: number) => {
        if (!guest || !settings.showGuestList) return;

        // Check-off circles are always black and independent of field colours.
        pdf.setDrawColor(black.r, black.g, black.b);
        pdf.setLineWidth(0.4);
        pdf.circle(xPos + 1.5, baselineY - 1.2, 1.5, 'S');
        
        const fontStyle = settings.isBold && settings.isItalic ? 'bolditalic' 
          : settings.isBold ? 'bold' 
          : settings.isItalic ? 'italic' 
          : 'normal';
        const guestName = formatGuestName(guest);
        const tableText = formatTableAssignment(guest, tableNameMap, tableIdNameMap);
        const guestNameColor = hexToRgb(settings.guestNameColor);
        const seatNumberColor = hexToRgb(settings.seatNumberColor);
        const dietaryColor = hexToRgb(settings.dietaryColor);
        const relationshipColor = hexToRgb(settings.relationshipColor);

        pdf.setFont('helvetica', fontStyle);
        pdf.setFontSize(fontSize);
        const nameWidth = settings.showGuestNames ? pdf.getTextWidth(guestName) : 0;
        if (settings.showGuestNames) {
          pdf.setTextColor(guestNameColor.r, guestNameColor.g, guestNameColor.b);
          pdf.text(guestName, xPos + 5, baselineY);
        }

        const tableWidth = settings.showSeatNumbers ? pdf.getTextWidth(tableText) : 0;
        const details = getFullSeatingChartGuestDetails(guest, settings.showDietary, settings.showRelation);
        if (details.dietary || details.relationship) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(fontSize);
          const detailsStartX = xPos + 5 + nameWidth;
          const maxDetailsX = xPos + columnWidth - tableWidth - (settings.showSeatNumbers ? 2 : 0);
          let cursorX = detailsStartX;
          const drawDetail = (text: string, color: { r: number; g: number; b: number }) => {
            if (cursorX >= maxDetailsX) return;
            let visibleText = text;
            while (pdf.getTextWidth(visibleText) > maxDetailsX - cursorX && visibleText.length > 4) {
              visibleText = `${visibleText.slice(0, -4)}...`;
            }
            pdf.setTextColor(color.r, color.g, color.b);
            pdf.text(visibleText, cursorX, baselineY);
            cursorX += pdf.getTextWidth(visibleText);
          };
          drawDetail(' (', { r: 0, g: 0, b: 0 });
          if (details.dietary) drawDetail(details.dietary, dietaryColor);
          if (details.dietary && details.relationship) drawDetail('/', { r: 0, g: 0, b: 0 });
          if (details.relationship) drawDetail(details.relationship, relationshipColor);
          drawDetail(')', { r: 0, g: 0, b: 0 });
        }

        // Underline for guest name
        if (settings.showGuestNames && settings.isUnderline) {
          pdf.setFont('helvetica', fontStyle);
          pdf.setFontSize(fontSize);
          pdf.setDrawColor(guestNameColor.r, guestNameColor.g, guestNameColor.b);
          pdf.setLineWidth(0.2);
          pdf.line(xPos + 5, baselineY + 0.5, xPos + 5 + nameWidth, baselineY + 0.5);
        }

        // Table assignment (right-aligned)
        if (settings.showSeatNumbers) {
          pdf.setFont('helvetica', fontStyle);
          pdf.setFontSize(fontSize);
          pdf.setTextColor(seatNumberColor.r, seatNumberColor.g, seatNumberColor.b);
          const tableX = xPos + columnWidth - tableWidth;
          pdf.text(tableText, tableX, baselineY);
          if (settings.isUnderline) {
            pdf.setDrawColor(seatNumberColor.r, seatNumberColor.g, seatNumberColor.b);
            pdf.setLineWidth(0.2);
            pdf.line(tableX, baselineY + 0.5, tableX + tableWidth, baselineY + 0.5);
          }
        }
        
        pdf.setTextColor(0, 0, 0);
      };

      drawGuest(guest1, leftColumnX, nameBaselineY);
      drawGuest(guest2, rightColumnX, nameBaselineY);
      
      // Row border at the bottom of this row
      const borderY = yPos + rowHeight;
      const guestListColor = hexToRgb(settings.guestListColor);
      pdf.setDrawColor(guestListColor.r, guestListColor.g, guestListColor.b);
      pdf.setLineWidth(FULL_SEATING_CHART_PDF_ROW_BORDER_WIDTH_MM);
      if (settings.showGuestList && guest1) pdf.line(leftColumnX, borderY, leftColumnX + columnWidth, borderY);
      if (settings.showGuestList && guest2) pdf.line(rightColumnX, borderY, rightColumnX + columnWidth, borderY);
      
      // Move to next row
      yPos += rowHeight;
    }

    // Draw the approved footer: generated left, logo centre, page number right.
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
  await savePdfAsync(pdf, fileName);
};
