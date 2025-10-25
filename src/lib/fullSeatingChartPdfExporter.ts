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

// Format guest name based on sort setting
const formatGuestName = (guest: Guest, sortBy: 'firstName' | 'lastName' | 'tableNo'): string => {
  if (sortBy === 'lastName') {
    return `${guest.last_name || ''}, ${guest.first_name}`.trim();
  }
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
};

// Format table assignment
const formatTableAssignment = (tableNo: number | null): string => {
  if (!tableNo) return 'Unassigned';
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
  settings: FullSeatingChartSettings
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
  const guestsPerColumn = 10;
  const guestsPerPage = 20;
  const totalPages = Math.ceil(guests.length / guestsPerPage);
  const fontSize = getFontSize(settings.fontSize);
  const timestamp = formatGeneratedTimestamp();

  // Load logo if needed
  let logoBase64: string | null = null;
  if (settings.showLogo) {
    logoBase64 = await loadLogoAsBase64();
  }

  // Purple color for event name and checkboxes
  const purple = { r: 109, g: 40, b: 217 }; // #6D28D9

  // Generate each page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) pdf.addPage();

    const startIdx = (pageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    // Split into two columns
    const col1Guests = pageGuests.slice(0, guestsPerColumn);
    const col2Guests = pageGuests.slice(guestsPerColumn);

    let yPos = margin;

    // Header - Event Name (16pt, bold, purple)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(purple.r, purple.g, purple.b);
    pdf.text(event.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Header - Chart Title + Date (12pt, bold, black)
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Full Seating Chart - ${formatDateWithOrdinal(event.date)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Header - Venue/Stats Line (10pt, black)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const statsLine = `${event.venue} - Total Guests: ${guests.length} - Page ${pageNum} of ${totalPages} - Generated on: ${timestamp}`;
    pdf.text(statsLine, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    // Draw border line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.25);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

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
    yPos += 8;

    // Draw guests in both columns
    const maxRows = Math.max(col1Guests.length, col2Guests.length);
    
    for (let i = 0; i < maxRows; i++) {
      const guest1 = col1Guests[i];
      const guest2 = col2Guests[i];

      // Helper function to draw a guest
      const drawGuest = (guest: Guest | undefined, xPos: number, yPos: number): number => {
        if (!guest) return yPos;

        let currentY = yPos;
        const hasDietary = settings.showDietary && guest.dietary && guest.dietary !== 'NA';
        const hasRelation = settings.showRelation && guest.relation_display;

        // Main row: checkbox + name + table
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize);
        
        // Draw purple circle checkbox
        pdf.setDrawColor(purple.r, purple.g, purple.b); // Purple stroke
        pdf.setLineWidth(0.4); // Thin line
        pdf.circle(xPos + 1.5, currentY - 1.5, 1.5, 'S'); // 'S' = stroke only (hollow circle)
        
        // Guest name (black)
        pdf.setTextColor(0, 0, 0);
        const guestName = formatGuestName(guest, settings.sortBy);
        pdf.text(guestName, xPos + 5, currentY);
        
        // Table assignment (bold, black, right-aligned within column)
        const tableText = formatTableAssignment(guest.table_no);
        const nameWidth = pdf.getTextWidth(guestName);
        const tableX = xPos + columnWidth - pdf.getTextWidth(tableText);
        pdf.text(tableText, Math.max(xPos + nameWidth + 10, tableX), currentY);
        
        currentY += hasDietary || hasRelation ? 4 : 6;

        // Dietary row (if enabled)
        if (hasDietary) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(102, 102, 102); // Gray
          pdf.text(`Dietary: ${guest.dietary}`, xPos + 5, currentY);
          currentY += hasRelation ? 4 : 6;
        }

        // Relation row (if enabled)
        if (hasRelation) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(102, 102, 102); // Gray
          pdf.text(guest.relation_display!, xPos + 5, currentY);
          currentY += 6;
        }

        return currentY;
      };

      // Draw both guests in parallel
      const leftY = drawGuest(guest1, leftColumnX, yPos);
      const rightY = drawGuest(guest2, rightColumnX, yPos);
      
      // Move to the lower of the two positions
      yPos = Math.max(leftY, rightY);

      // Check if we need more space for the next guest
      if (yPos > pageHeight - margin - 30) {
        break; // Stop if we're running out of space
      }
    }

    // Footer - Logo (if enabled)
    if (logoBase64) {
      const logoHeight = 10.5; // mm
      const logoWidth = 35; // mm (approximate)
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = pageHeight - margin - logoHeight;
      
      try {
        pdf.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.error('Failed to add logo to PDF:', error);
      }
    }
  }

  // Save PDF
  const fileName = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}-Full-Seating-Chart-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
