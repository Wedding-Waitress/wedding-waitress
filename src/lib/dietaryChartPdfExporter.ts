import jsPDF from 'jspdf';

interface DietaryGuest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  table_display: string;
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
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
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
    return `${partnerName} / ${roleLabel}`;
  }
  
  return roleLabel;
};

// Get table column configuration
const getTableColumns = (settings: DietaryChartSettings) => {
  const columns: Array<{ header: string; width: number }> = [];
  
  columns.push({ header: 'First Name', width: 30 });
  columns.push({ header: 'Last Name', width: 30 });
  columns.push({ header: 'Table', width: 25 });
  
  if (settings.showSeatNo) {
    columns.push({ header: 'Seat', width: 15 });
  }
  
  columns.push({ header: 'Dietary', width: 35 });
  
  if (settings.showMobile) {
    columns.push({ header: 'Mobile', width: 30 });
  }
  
  if (settings.showRelation) {
    columns.push({ header: 'Relation', width: 40 });
  }
  
  return columns;
};

export const exportDietaryChartToPdf = async (
  event: Event,
  guests: DietaryGuest[],
  settings: DietaryChartSettings,
  mode: 'single' | 'all' = 'all',
  totalDietaryCount?: number,
  externalSummaryCounts?: { label: string; count: number }[]
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

  // Use the actual total dietary count (for single page, this is passed separately)
  const displayTotalCount = totalDietaryCount ?? guests.length;

  // Purple color for event name and dietary info
  const purple = { r: 109, g: 40, b: 217 }; // #6D28D9
  const gray = { r: 107, g: 114, b: 128 }; // #6B7280

  // Get table columns
  const columns = getTableColumns(settings);

  // Load logo if needed
  let logoBase64: string | null = null;
  if (settings.showLogo) {
    logoBase64 = await loadLogoAsBase64();
  }

  // Calculate header height by doing a dry run
  // This ensures guestsPerPage matches the display exactly
  const calcHeaderHeight = (): number => {
    let h = 0;
    h += 6;  // event name
    h += 5;  // subtitle
    if (event.ceremony_date) h += 4; // ceremony line
    h += 4;  // reception line
    h += 5;  // purple divider + gap
    h += 5;  // total count line
    h += 14; // summary bar (increased from 10)
    h += 7;  // column headers (increased from 5)
    h += 3;  // gap after header (increased from 2)
    return h;
  };

  const headerContentHeight = calcHeaderHeight();
  const footerHeight = settings.showLogo ? 20 : 8;
  const availableForRows = pageHeight - (2 * margin) - headerContentHeight - footerHeight;
  
  // Match display: 25 rows for small, scale for others
  // Display uses availableHeight=228mm with rowHeight 9/10/11.5
  const rowHeightBySize: Record<string, number> = {
    'small': availableForRows / 25,
    'medium': availableForRows / 22,
    'large': availableForRows / 20
  };
  const rowHeight = rowHeightBySize[settings.fontSize] || availableForRows / 25;
  const guestsPerPage = Math.floor(availableForRows / rowHeight);
  
  const totalPages = Math.ceil(guests.length / guestsPerPage);

  // Dietary summary counts - use external counts if provided (synced from display page)
  const summaryCounts = externalSummaryCounts ?? (() => {
    const trackedTypes = [
      'Kids Meal', 'Pescatarian', 'Vegetarian', 'Vegan', 'Seafood Free',
      'Gluten Free', 'Dairy Free', 'Nut Free', 'Halal', 'Kosher', 'Vendor'
    ];
    return trackedTypes.map(type => {
      const typeLower = type.toLowerCase();
      return { label: type, count: guests.filter(g => {
        if (!g.dietary) return false;
        const val = g.dietary.toLowerCase().trim();
        if (val === typeLower) return true;
        if (val.startsWith(typeLower) || typeLower.startsWith(val)) return true;
        const minLen = Math.min(val.length, typeLower.length);
        if (minLen >= 4) {
          const prefixLen = Math.max(4, minLen - 1);
          if (val.substring(0, prefixLen) === typeLower.substring(0, prefixLen)) return true;
        }
        return false;
      }).length };
    });
  })();

  // Calculate column positions
  const colWidths: number[] = [];
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  columns.forEach(col => {
    colWidths.push((col.width / totalWidth) * contentWidth);
  });

  // Generate each page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) pdf.addPage();

    const startIdx = (pageNum - 1) * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);

    let yPos = margin;

    // Header - Event Name (18pt, bold, purple, centered)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(purple.r, purple.g, purple.b);
    pdf.text(event.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // Subtitle - "Kitchen Dietary Requirements" (normal, 12pt)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Kitchen Dietary Requirements', pageWidth / 2, yPos, { align: 'center' });
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

    // Purple divider line
    pdf.setDrawColor(purple.r, purple.g, purple.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Total Dietary Guest Requirements - below purple line, above summary bar
    const totalLabel = 'Total Dietary Guest Requirements: ';
    const totalCount = String(displayTotalCount);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(0, 0, 0);
    const labelWidth = pdf.getTextWidth(totalLabel);
    pdf.setFont('helvetica', 'bold');
    const countWidth = pdf.getTextWidth(totalCount);
    const totalTextWidth = labelWidth + countWidth;
    const startX = (pageWidth - totalTextWidth) / 2;
    pdf.setFont('helvetica', 'normal');
    pdf.text(totalLabel, startX, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(totalCount, startX + labelWidth, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 5;

    // Dietary summary bar (gray background with counts) - two rows
    const summaryBarHeight = 14;
    pdf.setFillColor(243, 243, 243);
    pdf.setDrawColor(204, 204, 204);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos); // top border
    pdf.rect(margin, yPos, contentWidth, summaryBarHeight, 'F');
    pdf.line(margin, yPos + summaryBarHeight, pageWidth - margin, yPos + summaryBarHeight); // bottom border

    if (summaryCounts.length > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(0, 0, 0);
      const row1Types = ['Kids Meal','Pescatarian','Vegetarian','Vegan','Seafood Free','Gluten Free'];
      const row2Types = ['Dairy Free','Nut Free','Halal','Kosher','Vendor Meal'];
      const row1 = summaryCounts.filter(item => row1Types.includes(item.label));
      const row2 = summaryCounts.filter(item => row2Types.includes(item.label));

      // Build text with bold counts
      const renderSummaryRow = (items: {label: string; count: number}[], yOffset: number) => {
        if (items.length === 0) return;
        // Calculate total width first
        let totalW = 0;
        const spacing = '    ';
        items.forEach((item, i) => {
          pdf.setFont('helvetica', 'normal');
          totalW += pdf.getTextWidth(`${item.label}: `);
          pdf.setFont('helvetica', 'bold');
          totalW += pdf.getTextWidth(String(item.count));
          if (i < items.length - 1) {
            pdf.setFont('helvetica', 'normal');
            totalW += pdf.getTextWidth(spacing);
          }
        });
        let x = (pageWidth - totalW) / 2;
        items.forEach((item, i) => {
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${item.label}: `, x, yOffset);
          x += pdf.getTextWidth(`${item.label}: `);
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(item.count), x, yOffset);
          x += pdf.getTextWidth(String(item.count));
          if (i < items.length - 1) {
            pdf.setFont('helvetica', 'normal');
            x += pdf.getTextWidth(spacing);
          }
        });
      };

      renderSummaryRow(row1, yPos + 5);
      renderSummaryRow(row2, yPos + 11);
    }
    yPos += summaryBarHeight;

    // Draw table column headers (bold, gray background with top and bottom borders)
    const headerBarHeight = 7;
    pdf.setFillColor(243, 243, 243);
    pdf.setDrawColor(204, 204, 204);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos); // top border
    pdf.rect(margin, yPos, contentWidth, headerBarHeight, 'F');
    pdf.line(margin, yPos + headerBarHeight, pageWidth - margin, yPos + headerBarHeight); // bottom border

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(0, 0, 0);
    
    let xPos = margin;
    columns.forEach((col, i) => {
      pdf.text(col.header, xPos + 1, yPos + 4.5);
      xPos += colWidths[i];
    });
    
    yPos += headerBarHeight + 5; // gap after header before first guest row

    // Determine font style from settings
    const textFontStyle = settings.isBold && settings.isItalic ? 'bolditalic' : settings.isBold ? 'bold' : settings.isItalic ? 'italic' : 'normal';

    // Draw guest rows - matching display row height and alternating colors
    pageGuests.forEach((guest, index) => {
      xPos = margin;
      
      // Alternating row backgrounds - even index = gray (matching display)
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251); // #F9FAFB
        pdf.rect(margin, yPos - 3, contentWidth, rowHeight, 'F');
      }

      let colIdx = 0;

      // First Name
      pdf.setFont('helvetica', textFontStyle);
      pdf.setFontSize(fontSize);
      pdf.setTextColor(0, 0, 0);
      const firstNameText = pdf.splitTextToSize(guest.first_name, colWidths[colIdx] - 2);
      pdf.text(firstNameText, xPos, yPos);
      if (settings.isUnderline) {
        const tw = pdf.getTextWidth(guest.first_name);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
        pdf.line(xPos, yPos + 0.5, xPos + Math.min(tw, colWidths[colIdx] - 2), yPos + 0.5);
      }
      xPos += colWidths[colIdx];
      colIdx++;

      // Last Name
      pdf.setFont('helvetica', textFontStyle);
      const lastNameVal = guest.last_name || '-';
      const lastNameText = pdf.splitTextToSize(lastNameVal, colWidths[colIdx] - 2);
      pdf.text(lastNameText, xPos, yPos);
      if (settings.isUnderline) {
        const tw = pdf.getTextWidth(lastNameVal);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
        pdf.line(xPos, yPos + 0.5, xPos + Math.min(tw, colWidths[colIdx] - 2), yPos + 0.5);
      }
      xPos += colWidths[colIdx];
      colIdx++;

      // Table
      pdf.setFont('helvetica', textFontStyle);
      const tableVal = guest.table_display || '-';
      const tableText = pdf.splitTextToSize(tableVal, colWidths[colIdx] - 2);
      pdf.text(tableText, xPos, yPos);
      if (settings.isUnderline) {
        const tw = pdf.getTextWidth(tableVal);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
        pdf.line(xPos, yPos + 0.5, xPos + Math.min(tw, colWidths[colIdx] - 2), yPos + 0.5);
      }
      xPos += colWidths[colIdx];
      colIdx++;

      // Seat (if shown)
      if (settings.showSeatNo) {
        const seatVal = guest.seat_no ? String(guest.seat_no) : '-';
        pdf.text(seatVal, xPos, yPos);
        if (settings.isUnderline) {
          const tw = pdf.getTextWidth(seatVal);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.2);
          pdf.line(xPos, yPos + 0.5, xPos + Math.min(tw, colWidths[colIdx] - 2), yPos + 0.5);
        }
        xPos += colWidths[colIdx];
        colIdx++;
      }

      // Dietary (purple)
      const dietaryFontStyle = settings.isBold && settings.isItalic ? 'bolditalic' : settings.isBold ? 'bold' : settings.isItalic ? 'italic' : 'normal';
      pdf.setFont('helvetica', dietaryFontStyle);
      pdf.setTextColor(purple.r, purple.g, purple.b);
      const dietaryText = pdf.splitTextToSize(guest.dietary || '-', colWidths[colIdx] - 2);
      pdf.text(dietaryText, xPos, yPos);
      xPos += colWidths[colIdx];
      colIdx++;

      // Mobile (if shown)
      if (settings.showMobile) {
        pdf.setFont('helvetica', textFontStyle);
        pdf.setTextColor(0, 0, 0);
        const mobileVal = guest.mobile || '-';
        const mobileText = pdf.splitTextToSize(mobileVal, colWidths[colIdx] - 2);
        pdf.text(mobileText, xPos, yPos);
        if (settings.isUnderline) {
          const tw = pdf.getTextWidth(mobileVal);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.2);
          pdf.line(xPos, yPos + 0.5, xPos + Math.min(tw, colWidths[colIdx] - 2), yPos + 0.5);
        }
        xPos += colWidths[colIdx];
        colIdx++;
      }

      // Relation (if shown, black to match display page)
      if (settings.showRelation) {
        pdf.setFont('helvetica', textFontStyle);
        pdf.setTextColor(0, 0, 0);
        const relationText = computeRelationDisplay(guest, event);
        const relationTextWrapped = pdf.splitTextToSize(relationText, colWidths[colIdx] - 2);
        pdf.text(relationTextWrapped, xPos, yPos);
        if (settings.isUnderline) {
          const tw = pdf.getTextWidth(relationText);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.2);
          pdf.line(xPos, yPos + 0.5, xPos + Math.min(tw, colWidths[colIdx] - 2), yPos + 0.5);
        }
      }

      yPos += rowHeight;
    });

    // Footer
    const footerZone = 25;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, pageHeight - footerZone, pageWidth, footerZone, 'F');

    // Logo centered
    if (logoBase64) {
      const logoHeight = 12;
      const logoWidth = 42;
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = pageHeight - 3 - logoHeight - 2;
      
      try {
        pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.error('Failed to add logo to PDF:', error);
      }
    }

    // Page number (left) and Generated timestamp (right)
    pdf.setFontSize(7);
    pdf.setTextColor(170, 170, 170);
    pdf.text(`Page ${pageNum} of ${totalPages}`, margin, pageHeight - 3);
    pdf.text(`Generated: ${timestamp}`, pageWidth - margin, pageHeight - 3, { align: 'right' });
  }

  // Save PDF
  const pageLabel = mode === 'single' ? 'Single Page' : 'All Pages';
  const safeName = event.name.replace(/[\/:*?"<>|]/g, '');
  const eventDate = event.date ? (() => {
    const d = new Date(event.date + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  })() : new Date().toISOString().split('T')[0];
  const fileName = `${safeName}-Dietary Requirements-${pageLabel}-${eventDate}.pdf`;
  pdf.save(fileName);
};
