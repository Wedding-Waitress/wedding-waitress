import jsPDF from 'jspdf';

interface Guest {
  id: string;
  first_name: string;
  last_name: string | null;
  table_no: number | null;
  dietary: string | null;
  relation_display: string | null;
}

interface FullSeatingChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo';
  fontSize: 'small' | 'medium' | 'large';
  showDietary: boolean;
  showRsvp: boolean;
  showRelation: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
}

// Convert font size setting to points
const getFontSize = (setting: 'small' | 'medium' | 'large'): number => {
  switch (setting) {
    case 'small': return 10.5;
    case 'medium': return 12;
    case 'large': return 13.5;
  }
};

// Format date with ordinal suffix
const formatDateWithOrdinal = (dateString: string): string => {
  const date = new Date(dateString);
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

// Format guest name - first name only for two-line display
const formatGuestName = (guest: Guest): string => {
  return guest.first_name;
};

// Format table assignment using name map
const formatTableAssignment = (tableNo: number | null, tableNameMap?: Record<number, string>): string => {
  if (!tableNo) return 'Unassigned';
  if (tableNameMap && tableNameMap[tableNo]) return tableNameMap[tableNo];
  return `Table ${tableNo}`;
};

// Load logo image as base64
const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch('/jpeg-2.jpg');
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

export const exportFullSeatingChartToPdf = async (
  event: Event,
  guests: Guest[],
  settings: FullSeatingChartSettings,
  pageNum?: number,
  totalPagesOverride?: number,
  tableNameMap?: Record<number, string>
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 12.7; // 1.27cm margins
  const contentWidth = pageWidth - (2 * margin);
  
  /**
   * AUTOFIT CALCULATION - Dynamic guests per page based on font size and visible fields
   * Must match the calculation in FullSeatingChartPreview and FullSeatingChartPage
   * Increased heights for two-line format
   */
  const baseRowHeight: Record<string, number> = {
    'small': 10,
    'medium': 11,
    'large': 13
  };
  
  // Row height is now fixed per font size (dietary/relation displayed inline)
  const rowHeight = baseRowHeight[settings.fontSize] || 11;
  
  // Available height for guest rows - reduced to 155mm to ensure 2-3 line gap above footer
  const availableHeight = 155; // mm for guest rows - must match preview calculation
  
  const calculatedGuestsPerColumn = Math.floor(availableHeight / rowHeight);
  // Clamp to minimum 1 guest per column
  const guestsPerColumn = Math.max(1, calculatedGuestsPerColumn);
  const guestsPerPage = guestsPerColumn * 2;
  
  const totalPages = totalPagesOverride || Math.ceil(guests.length / guestsPerPage);
  const fontSize = getFontSize(settings.fontSize);
  const timestamp = formatGeneratedTimestamp();

  // Load logo if needed
  let logoBase64: string | null = null;
  if (settings.showLogo) {
    logoBase64 = await loadLogoAsBase64();
  }

  // Purple color for event name and checkboxes
  const purple = { r: 109, g: 40, b: 217 }; // #6D28D9

  // Determine actual pages to generate
  const startPage = pageNum || 1;
  const endPage = pageNum || totalPages;

  // Generate each page
  for (let currentPageNum = startPage; currentPageNum <= endPage; currentPageNum++) {
    if (currentPageNum > startPage) pdf.addPage();

    const startIdx = (currentPageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    // Split into two columns based on auto-fit
    const col1Guests = pageGuests.slice(0, guestsPerColumn);
    const col2Guests = pageGuests.slice(guestsPerColumn);

    let yPos = margin;

    // Header - Event Name (16pt, bold, purple)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(purple.r, purple.g, purple.b);
    pdf.text(event.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    // Header - Chart Title + Date (12pt, bold, black)
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Full Seating Chart - ${formatDateWithOrdinal(event.date)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    // Header - Venue/Stats Line (10pt, black)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const statsLine = `${event.venue} - Total Guests: ${guests.length} - Page ${currentPageNum} of ${totalPages} - Generated on: ${timestamp}`;
    pdf.text(statsLine, pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;

    // Draw border line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.25);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Column calculations
    const columnWidth = (contentWidth - 12) / 2;
    const leftColumnX = margin;
    const rightColumnX = margin + columnWidth + 12;

    // Calculate guest ranges for column headers
    const col1Start = startIdx + 1;
    const col1End = startIdx + col1Guests.length;
    const col2Start = startIdx + col1Guests.length + 1;
    const col2End = endIdx;

    // Column headers (11pt, bold)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`GUESTS ${col1Start}-${col1End}`, leftColumnX, yPos);
    if (col2Guests.length > 0) {
      pdf.text(`GUESTS ${col2Start}-${col2End}`, rightColumnX, yPos);
    }
    yPos += 5;

    // Draw guests in both columns
    const maxRows = Math.max(col1Guests.length, col2Guests.length);
    
    for (let i = 0; i < maxRows; i++) {
      const guest1 = col1Guests[i];
      const guest2 = col2Guests[i];

      // Helper function to draw a guest with two-line format
      const drawGuest = (guest: Guest | undefined, xPos: number, yPos: number): number => {
        if (!guest) return yPos;

        const hasDietary = settings.showDietary && guest.dietary && guest.dietary !== 'NA';
        const hasRelation = settings.showRelation && guest.relation_display;

        // Draw purple circle checkbox
        pdf.setDrawColor(purple.r, purple.g, purple.b);
        pdf.setLineWidth(0.4);
        pdf.circle(xPos + 1.5, yPos - 1.5, 1.5, 'S');
        
        // Line 1: Guest first name (bold, black)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0, 0, 0);
        const guestName = formatGuestName(guest);
        pdf.text(guestName, xPos + 5, yPos);
        
        // Table assignment text (right-aligned, same line as name)
        const tableText = formatTableAssignment(guest.table_no);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize - 1);
        const tableWidth = pdf.getTextWidth(tableText);
        const tableX = xPos + columnWidth - tableWidth;
        pdf.text(tableText, tableX, yPos);
        
        // Line 2: Build info string (dietary/relation)
        const infoParts: string[] = [];
        if (hasDietary) infoParts.push(guest.dietary!);
        if (hasRelation) infoParts.push(guest.relation_display!.replace(' — ', ' / '));
        const inlineInfo = infoParts.join('/');
        
        // Draw info on second line if present
        if (inlineInfo) {
          const line2Y = yPos + (fontSize * 0.4);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(fontSize - 2);
          pdf.setTextColor(102, 102, 102);
          
          // Truncate if too long
          const maxInfoWidth = columnWidth - 10;
          let truncatedInfo = inlineInfo;
          while (pdf.getTextWidth(truncatedInfo) > maxInfoWidth && truncatedInfo.length > 3) {
            truncatedInfo = truncatedInfo.slice(0, -4) + '...';
          }
          pdf.text(truncatedInfo, xPos + 5, line2Y);
        }

        // Return position for next row (account for two lines)
        return yPos + rowHeight * 1.5;
      };

      // Draw both guests in parallel
      const leftY = drawGuest(guest1, leftColumnX, yPos);
      const rightY = drawGuest(guest2, rightColumnX, yPos);
      
      // Move to the lower of the two positions
      yPos = Math.max(leftY, rightY);

      // Check if we need more space for the next guest - increased safety margin
      if (yPos > pageHeight - margin - 35) {
        break; // Stop if we're running out of space
      }
    }

    // Footer - Logo (if enabled) with reserved space
    if (logoBase64) {
      const logoHeight = 10.5; // mm
      const logoWidth = 35; // mm (approximate)
      const logoX = (pageWidth - logoWidth) / 2;
      const footerReservedSpace = 15; // mm reserved for footer
      const logoY = pageHeight - margin - footerReservedSpace + ((footerReservedSpace - logoHeight) / 2);
      
      try {
        pdf.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.error('Failed to add logo to PDF:', error);
      }
    }
  }

  // Save PDF - use event date formatted as DD-MM-YYYY
  const eventDate = event.date ? new Date(event.date) : new Date();
  const dd = String(eventDate.getDate()).padStart(2, '0');
  const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
  const yyyy = eventDate.getFullYear();
  const formattedDate = `${dd}-${mm}-${yyyy}`;
  const pageLabel = pageNum ? 'Single Page' : 'All Pages';
  const safeName = event.name.replace(/[\/:*?"<>|]/g, '');
  const fileName = `${safeName}-Full Seating Chart-${pageLabel}-${formattedDate}.pdf`;
  pdf.save(fileName);
};
