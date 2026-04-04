import jsPDF from 'jspdf';

interface DietaryGuest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  seat_no: number | null;
  dietary: string;
  mobile: string | null;
  relation_partner: string;
  relation_role: string;
}

interface DietaryChartSettings {
  sortBy: 'firstName' | 'lastName' | 'tableNo' | 'dietary';
  fontSize: 'small' | 'medium' | 'large';
  showMobile: boolean;
  showRelation: boolean;
  showSeatNo: boolean;
  showLogo: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
}

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  partner1_name?: string | null;
  partner2_name?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
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
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const formatDateWithOrdinal = (dateString: string | null | undefined): string => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday} ${day}${ordinal}, ${month} ${year}`;
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

// Format current timestamp
const formatGeneratedTimestamp = (): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${dateStr} Time: ${displayHours}:${minutes} ${ampm}`;
};

// Load logo image as base64
const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch('/wedding-waitress-pdf-footer-logo.png');
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

// Compute relation display
const computeRelationDisplay = (
  guest: DietaryGuest,
  event: Event
): string => {
  if (!guest.relation_partner || !guest.relation_role) return 'Guest';
  
  const partnerName = guest.relation_partner === 'partner_one' 
    ? event.partner1_name 
    : event.partner2_name;
  
  // Role mappings
  const roleMap: Record<string, string> = {
    'bride': 'Bride',
    'groom': 'Groom',
    'mother': 'Mother',
    'father': 'Father',
    'sister': 'Sister',
    'brother': 'Brother',
    'grandmother': 'Grandmother',
    'grandfather': 'Grandfather',
    'aunt': 'Aunt',
    'uncle': 'Uncle',
    'cousin': 'Cousin',
    'friend': 'Friend',
    'colleague': 'Colleague',
    'bridal_party': 'Bridal Party',
  };
  
  const roleLabel = roleMap[guest.relation_role] || 'Guest';
  
  if (partnerName) {
    return `${partnerName} — ${roleLabel}`;
  }
  
  return roleLabel;
};

// Get table column configuration
const getTableColumns = (settings: DietaryChartSettings) => {
  const columns: Array<{ header: string; width: number }> = [];
  
  columns.push({ header: 'First Name', width: 30 });
  columns.push({ header: 'Last Name', width: 30 });
  columns.push({ header: 'Table', width: 15 });
  
  if (settings.showSeatNo) {
    columns.push({ header: 'Seat', width: 15 });
  }
  
  columns.push({ header: 'Dietary', width: 35 });
  
  if (settings.showMobile) {
    columns.push({ header: 'Mobile', width: 30 });
  }
  
  if (settings.showRelation) {
    columns.push({ header: 'Relation', width: 30 });
  }
  
  return columns;
};

// Calculate row height based on font size (in mm)
const getRowHeight = (fontSize: 'small' | 'medium' | 'large'): number => {
  switch (fontSize) {
    case 'small': return 5;
    case 'medium': return 5.5;
    case 'large': return 6;
  }
};

export const exportDietaryChartToPdf = async (
  event: Event,
  guests: DietaryGuest[],
  settings: DietaryChartSettings
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
  const fontSize = getFontSize(settings.fontSize);
  const timestamp = formatGeneratedTimestamp();

  // AUTOFIT CALCULATION - Dynamic guests per page based on font size
  const headerHeight = 22; // mm for header section (title, date, meta line)
  const tableHeaderHeight = 6; // mm for table column headers
  const footerHeight = settings.showLogo ? 15 : 5; // mm for footer (logo or spacing)
  const rowHeight = getRowHeight(settings.fontSize);
  
  // Calculate available height for guest rows
  const availableContentHeight = pageHeight - (2 * margin) - headerHeight - tableHeaderHeight - footerHeight;
  const guestsPerPage = Math.floor(availableContentHeight / rowHeight);
  
  const totalPages = Math.ceil(guests.length / guestsPerPage);

  // Load logo if needed
  let logoBase64: string | null = null;
  if (settings.showLogo) {
    logoBase64 = await loadLogoAsBase64();
  }

  // Purple color for event name and dietary info
  const purple = { r: 109, g: 40, b: 217 }; // #6D28D9
  const gray = { r: 107, g: 114, b: 128 }; // #6B7280

  // Get table columns
  const columns = getTableColumns(settings);

  // Generate each page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) pdf.addPage();

    const startIdx = (pageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    let yPos = margin;

    // Header - Event Name (18pt, bold, purple, centered) - matching FSC
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(purple.r, purple.g, purple.b);
    pdf.text(event.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // Subtitle - "Kitchen Dietary Requirements - Total Dietary Guests: X" (normal, 12pt)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Kitchen Dietary Requirements - Total Dietary Guests: ${guests.length}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    // Ceremony info line (if available)
    pdf.setFontSize(9);
    pdf.setTextColor(85, 85, 85);
    if (event.ceremony_date) {
      const ceremonyLine = `Ceremony: ${formatDateWithOrdinal(event.ceremony_date)} | ${event.ceremony_venue || 'Venue TBD'} | ${formatTimeDisplay(event.ceremony_start_time)} – ${formatTimeDisplay(event.ceremony_finish_time)}`;
      pdf.text(ceremonyLine, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }

    // Reception info line
    const receptionLine = `Reception: ${formatDateWithOrdinal(event.date)} | ${event.venue || 'Venue TBD'} | ${formatTimeDisplay(event.start_time)} – ${formatTimeDisplay(event.finish_time)}`;
    pdf.text(receptionLine, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    // Purple divider line - matching FSC
    pdf.setDrawColor(purple.r, purple.g, purple.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Calculate column positions
    const colWidths: number[] = [];
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    columns.forEach(col => {
      colWidths.push((col.width / totalWidth) * contentWidth);
    });

    let xPos = margin;

    // Draw table headers (bold, with underline)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(0, 0, 0);
    
    columns.forEach((col, i) => {
      pdf.text(col.header, xPos, yPos);
      xPos += colWidths[i];
    });
    
    // Underline headers
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos + 1, pageWidth - margin, yPos + 1);
    yPos += rowHeight;

    // Draw guest rows
    pageGuests.forEach((guest, index) => {
      xPos = margin;
      
      // Alternating row backgrounds
      if (index % 2 === 1) {
        pdf.setFillColor(249, 250, 251); // #F9FAFB
        pdf.rect(margin, yPos - 3, contentWidth, rowHeight, 'F');
      }

      let colIdx = 0;

      // First Name (bold)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(0, 0, 0);
      const firstNameText = pdf.splitTextToSize(guest.first_name, colWidths[colIdx] - 2);
      pdf.text(firstNameText, xPos, yPos);
      xPos += colWidths[colIdx];
      colIdx++;

      // Last Name (bold)
      pdf.setFont('helvetica', 'bold');
      const lastNameText = pdf.splitTextToSize(guest.last_name || '-', colWidths[colIdx] - 2);
      pdf.text(lastNameText, xPos, yPos);
      xPos += colWidths[colIdx];
      colIdx++;

      // Table (normal)
      pdf.setFont('helvetica', 'normal');
      pdf.text(guest.table_no ? String(guest.table_no) : '-', xPos, yPos);
      xPos += colWidths[colIdx];
      colIdx++;

      // Seat (if shown)
      if (settings.showSeatNo) {
        pdf.text(guest.seat_no ? String(guest.seat_no) : '-', xPos, yPos);
        xPos += colWidths[colIdx];
        colIdx++;
      }

      // Dietary (bold, purple)
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(purple.r, purple.g, purple.b);
      const dietaryText = pdf.splitTextToSize(guest.dietary || '-', colWidths[colIdx] - 2);
      pdf.text(dietaryText, xPos, yPos);
      xPos += colWidths[colIdx];
      colIdx++;

      // Mobile (if shown)
      if (settings.showMobile) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const mobileText = pdf.splitTextToSize(guest.mobile || '-', colWidths[colIdx] - 2);
        pdf.text(mobileText, xPos, yPos);
        xPos += colWidths[colIdx];
        colIdx++;
      }

      // Relation (if shown, gray)
      if (settings.showRelation) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(gray.r, gray.g, gray.b);
        const relationText = computeRelationDisplay(guest, event);
        const relationTextWrapped = pdf.splitTextToSize(relationText, colWidths[colIdx] - 2);
        pdf.text(relationTextWrapped, xPos, yPos);
      }

      yPos += rowHeight; // Dynamic row spacing based on font size
    });

    // Footer - Logo (if enabled) - FIXED position at bottom of page
    if (logoBase64) {
      const logoHeight = 10.5; // mm
      const logoWidth = 35; // mm (approximate)
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = pageHeight - margin - logoHeight; // Fixed at bottom
      
      try {
        pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.error('Failed to add logo to PDF:', error);
      }
    }
  }

  // Save PDF
  const fileName = `kitchen-dietary-requirements-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  pdf.save(fileName);
};
