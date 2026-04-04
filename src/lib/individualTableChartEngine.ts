/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Individual Table Charts feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated A4 export system,
 * seat positioning algorithms, and multi-table PDF generation.
 * 
 * Last completed: 2025-10-04
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { IndividualChartSettings } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { format } from 'date-fns';
import weddingWaitressLogoFull from '@/assets/wedding-waitress-new-logo.png';

// Paper size constants (in mm)
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
};

/**
 * Generate PDF for individual table seating chart
 */
export const generateIndividualTableChartPDF = async (
  settings: IndividualChartSettings,
  table: TableWithGuestCount,
  guests: Guest[],
  event: any
): Promise<Blob> => {
  const svgContent = generateIndividualTableSVG(settings, table, guests, event);
  
  // Create a temporary container for rendering
  const container = document.createElement('div');
  container.innerHTML = svgContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '794px'; // A4 width in pixels at 96 DPI
  container.style.height = '1123px'; // A4 height in pixels at 96 DPI
  document.body.appendChild(container);

  try {
    // Wait for fonts to load before capturing
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Convert to canvas with improved settings
    const canvas = await html2canvas(container, {
      width: 794,
      height: 1123,
      scale: 3, // Higher quality for better text
      useCORS: true,
      backgroundColor: '#ffffff',
      // Critical settings for text rendering
      foreignObjectRendering: false,
      allowTaint: false,
      removeContainer: true,
      imageTimeout: 30000,
      logging: false,
      // Force better text quality
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
            font-display: swap !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    // Create PDF
    const { width, height } = PAPER_SIZES[settings.paperSize];
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [width, height]
    });

    // Add the canvas as image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Generate image for individual table seating chart
 */
export const generateIndividualTableChartImage = async (
  settings: IndividualChartSettings,
  table: TableWithGuestCount,
  guests: Guest[],
  event: any,
  format: 'png' | 'jpg'
): Promise<Blob> => {
  const svgContent = generateIndividualTableSVG(settings, table, guests, event);
  
  // Create a temporary container for rendering
  const container = document.createElement('div');
  container.innerHTML = svgContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '794px';
  container.style.height = '1123px';
  document.body.appendChild(container);

  try {
    // Wait for fonts to load before capturing
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      width: 794,
      height: 1123,
      scale: 3, // Higher quality for better text
      useCORS: true,
      backgroundColor: '#ffffff',
      // Critical settings for text rendering
      foreignObjectRendering: false,
      allowTaint: false,
      removeContainer: true,
      imageTimeout: 30000,
      logging: false,
      // Force better text quality
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
            font-display: swap !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
    });
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Generate PDF for all tables in an event
 */
export const generateAllTablesChartPDF = async (
  settings: IndividualChartSettings,
  tables: TableWithGuestCount[],
  guests: Guest[],
  event: any
): Promise<Blob> => {
  if (tables.length === 0) {
    throw new Error('No tables to export');
  }

  const { width, height } = PAPER_SIZES[settings.paperSize];
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, height]
  });

  // Process each table
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const tableGuests = guests.filter(guest => guest.table_id === table.id);
    const tableSettings = {
      ...settings,
      title: `TABLE ${table.table_no ?? table.name}`,
      totalTables: tables.length,
      currentTableIndex: i + 1
    };
    
    const svgContent = generateIndividualTableSVG(tableSettings, table, tableGuests, event);
    
    // Create temporary container
    const container = document.createElement('div');
    container.innerHTML = svgContent;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '794px';
    container.style.height = '1123px';
    document.body.appendChild(container);

    try {
      // Wait for fonts to load before capturing
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Convert to canvas with improved settings
      const canvas = await html2canvas(container, {
        width: 794,
        height: 1123,
        scale: 3, // Higher quality for better text
        useCORS: true,
        backgroundColor: '#ffffff',
        // Critical settings for text rendering
        foreignObjectRendering: false,
        allowTaint: false,
        removeContainer: true,
        imageTimeout: 30000,
        logging: false,
        // Force better text quality
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: optimizeLegibility !important;
              font-display: swap !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      // Add new page for each table (except the first one)
      if (i > 0) {
        pdf.addPage();
      }

      // Add the canvas as image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    } finally {
      document.body.removeChild(container);
    }
  }

  return pdf.output('blob');
};

/**
 * Print individual table chart in a new window
 * Uses proper A4 scaling to match PDF output
 */
export const printIndividualTableChart = (
  settings: IndividualChartSettings,
  table: TableWithGuestCount,
  guests: Guest[],
  event: any
): void => {
  const svgContent = generateIndividualTableSVG(settings, table, guests, event);
  
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups for this site.');
  }

  // Scale factor: A4 is 210mm x 297mm, content is 794px x 1123px
  // At 96 DPI: 210mm = 794px, 297mm = 1123px (already matched)
  // We need to ensure the browser scales this correctly to A4
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Table ${table.table_no} - ${event?.name || 'Event'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          .page-container {
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            position: relative;
          }
          .page-content {
            width: 794px;
            height: 1123px;
            transform-origin: top left;
            /* Scale from 794px to 210mm (793.7px at 96dpi) - exact fit */
            transform: scale(calc(210mm / 794px));
          }
          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
            }
            .page-container {
              width: 210mm;
              height: 297mm;
            }
            .page-content {
              transform: scale(1);
              width: 100%;
              height: 100%;
            }
            .page-content > div {
              width: 100% !important;
              height: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="page-content">
            ${svgContent}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Print all tables in a new window with page breaks
 * Uses proper A4 scaling to match PDF output
 */
export const printAllTablesChart = (
  settings: IndividualChartSettings,
  tables: TableWithGuestCount[],
  guests: Guest[],
  event: any
): void => {
  if (tables.length === 0) {
    throw new Error('No tables to print');
  }

  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups for this site.');
  }

  // Generate content for each table with proper page structure
  const allTablesContent = tables.map((table, index) => {
    const tableGuests = guests.filter(guest => guest.table_id === table.id);
    const tableSettings = {
      ...settings,
      title: `TABLE ${table.table_no ?? table.name}`,
      totalTables: tables.length,
      currentTableIndex: index + 1
    };
    
    const svgContent = generateIndividualTableSVG(tableSettings, table, tableGuests, event);
    
    // Each table in its own page container
    const isLastPage = index === tables.length - 1;
    return `
      <div class="page-container" style="${!isLastPage ? 'page-break-after: always;' : ''}">
        <div class="page-content">
          ${svgContent}
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>All Tables - ${event?.name || 'Event'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          .page-container {
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            position: relative;
          }
          .page-content {
            width: 794px;
            height: 1123px;
            transform-origin: top left;
            transform: scale(calc(210mm / 794px));
          }
          @media print {
            .page-container {
              width: 210mm;
              height: 297mm;
            }
            .page-content {
              transform: scale(1);
              width: 100%;
              height: 100%;
            }
            .page-content > div {
              width: 100% !important;
              height: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        ${allTablesContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Generate SVG content for individual table chart
 */
export const generateIndividualTableSVG = (
  settings: IndividualChartSettings,
  table: TableWithGuestCount,
  guests: Guest[],
  event: any
): string => {
  const tableGuests = guests.filter(guest => guest.table_id === table.id);
  const sortedGuests = tableGuests.sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));

  // Get font sizes - using pt for better PDF rendering
  const getFontSize = (size: string) => {
    switch (size) {
      case 'small': return '10pt';
      case 'large': return '14pt';
      default: return '12pt';
    }
  };

  const getTitleSize = (size: string) => {
    switch (size) {
      case 'small': return 18;   // Matches Tailwind text-lg
      case 'large': return 30;   // Matches Tailwind text-3xl
      default: return 24;        // Matches Tailwind text-2xl
    }  
  };

  // Auto-fit font scaling for guest list to ensure logo is always visible
  const getAutoFitGuestListFontSize = (guestCount: number, fontSize: string, includeGuestList: boolean, includeDietary: boolean): number => {
    if (!includeGuestList) return 11; // Default 11pt if no guest list
    
    // A4 page height: 1123px, padding: 80px (40px top + 40px bottom)
    const availableHeight = 1123 - 80; // 1043px available
    
    // Fixed heights (in pixels at 96 DPI)
    const headerHeight = 110; // Header section including border
    const tableVisualizationHeight = 480; // 450px + 30px margin
    const logoHeight = 68; // 48px logo + 20px padding/margin
    const guestListTitleHeight = 40; // Title with underline
    
    // Calculate remaining space for guest list content
    const remainingHeight = availableHeight - headerHeight - tableVisualizationHeight - logoHeight - guestListTitleHeight;
    
    // Calculate rows needed (2 columns, so divide by 2 and round up)
    const rowsNeeded = Math.ceil(guestCount / 2);
    
    // Base font sizes in pt and corresponding row heights in px
    const fontConfigs = {
      'small': { basePt: 10.5, rowHeight: 24 },
      'medium': { basePt: 11, rowHeight: 28 },
      'large': { basePt: 13.5, rowHeight: 34 }
    };
    
    const config = fontConfigs[fontSize as keyof typeof fontConfigs] || fontConfigs['medium'];
    const requiredHeight = rowsNeeded * config.rowHeight;
    
    if (requiredHeight <= remainingHeight) {
      return config.basePt; // No scaling needed
    }
    
    // Calculate scale factor to fit
    const scaleFactor = remainingHeight / requiredHeight;
    const scaledPt = config.basePt * scaleFactor;
    
    // Minimum readable font size is 8pt
    return Math.max(scaledPt, 8);
  };

  const autoFitGuestListFontPt = getAutoFitGuestListFontSize(
    sortedGuests.length, 
    settings.fontSize, 
    settings.includeGuestList, 
    settings.includeDietary
  );
  
  // Calculate scaled row height based on font size
  const getScaledRowHeight = (fontPt: number): number => {
    // Base ratio: 11pt = 28px row height, scale proportionally
    return Math.round(fontPt * 2.5);
  };
  
  const scaledRowHeight = getScaledRowHeight(autoFitGuestListFontPt);

  // Auto-fit function that scales font size based on text length to fit container
  const getAutoFitFontSize = (text: string, baseSize: number, containerWidth: number = 250) => {
    const charWidthRatio = 0.6;
    const textLength = String(text).length;
    const estimatedWidth = textLength * baseSize * charWidthRatio;
    
    if (estimatedWidth <= containerWidth) {
      return baseSize;
    }
    
    const scaleFactor = containerWidth / estimatedWidth;
    const scaledSize = Math.floor(baseSize * scaleFactor);
    return Math.max(scaledSize, 12); // Minimum 12px
  };

  // Helper function to determine chair side for square tables
  const getChairSide = (angle: number) => {
    const normalizedAngle = ((angle + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    
    if (normalizedAngle >= 7 * Math.PI / 4 || normalizedAngle < Math.PI / 4) return 'top';
    if (normalizedAngle >= Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) return 'right';
    if (normalizedAngle >= 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) return 'bottom';
    return 'left';
  };

  // Arrange seats around table - only for assigned guests
  const arrangeSeats = () => {
    const guestCount = sortedGuests.length;
    const seats = [];
    
    // Fixed container dimensions - match IndividualTableChartPreview exactly
    const containerWidth = 500;
    const containerHeight = 450;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Only create seats for actual guests assigned to this table
    for (let i = 0; i < guestCount; i++) {
      const guest = sortedGuests[i];
      
      let x, y, labelX, labelY, textAlign, transform, angle;
      
      if (settings.tableShape === 'square') {
        // SQUARE TABLE: Side-based centered distribution
        // Divide guests into 4 groups, one per side, centered on each side
        const guestsPerSide = Math.ceil(guestCount / 4);
        
        const side = Math.floor(i / guestsPerSide); // 0=top, 1=right, 2=bottom, 3=left
        const positionInSide = i % guestsPerSide;
        
        // Calculate how many guests are actually on this side
        const startIdx = side * guestsPerSide;
        const endIdx = Math.min(startIdx + guestsPerSide, guestCount);
        const guestsOnThisSide = endIdx - startIdx;
        
        // Use wider spacing for top/bottom (horizontal names need more room)
        // Use tighter spacing for left/right (vertical names extend outward)
        const isHorizontalSide = side === 0 || side === 2;
        const chairSpacing = isHorizontalSide ? 16 : 14; // 16% for top/bottom, 14% for left/right
        
        // Calculate centered positioning for this side's group
        const totalWidth = (guestsOnThisSide - 1) * chairSpacing;
        const startOffset = 50 - (totalWidth / 2);
        const positionPercent = startOffset + (positionInSide * chairSpacing);
        
        if (side === 0) {
          // Top side - horizontal line, chairs ~10% from table edge
          x = (positionPercent / 100) * containerWidth;
          y = (10 / 100) * containerHeight; // Equal distance from table (~10% clearance)
          labelX = x;
          labelY = y - 20; // Labels above chairs
          textAlign = 'center';
          transform = 'translate(-50%, -100%)';
          angle = -Math.PI / 2;
        } else if (side === 1) {
          // Right side - vertical line, chairs ~10% from table edge
          x = (88 / 100) * containerWidth; // Equal distance from table (~10% clearance)
          y = (positionPercent / 100) * containerHeight;
          labelX = x + 12; // Labels right of chairs (closer)
          labelY = y;
          textAlign = 'left';
          transform = 'translate(0, -50%)';
          angle = 0;
        } else if (side === 2) {
          // Bottom side - horizontal line (reverse order for natural reading)
          x = ((100 - positionPercent) / 100) * containerWidth;
          y = (90 / 100) * containerHeight; // Equal distance from table (~10% clearance)
          labelX = x;
          labelY = y + 20; // Labels below chairs
          textAlign = 'center';
          transform = 'translate(-50%, 0)';
          angle = Math.PI / 2;
        } else {
          // Left side - vertical line (reverse order), chairs ~10% from table edge
          x = (12 / 100) * containerWidth; // Equal distance from table (~10% clearance)
          y = ((100 - positionPercent) / 100) * containerHeight;
          labelX = x - 12; // Labels left of chairs (closer)
          labelY = y;
          textAlign = 'right';
          transform = 'translate(-100%, -50%)';
          angle = Math.PI;
        }
        
      } else {
        // ROUND TABLE: Use pixel-based positioning for perfect circle
        angle = (i / guestCount) * 2 * Math.PI - Math.PI / 2; // Start from top, evenly distributed
        
        // Use smaller dimension to ensure perfect circle (not ellipse)
        const circleBaseDimension = Math.min(containerWidth, containerHeight);
        const radiusPixels = (37 / 100) * circleBaseDimension;
        
        // Calculate position directly in pixels using true circular geometry
        x = centerX + radiusPixels * Math.cos(angle);
        y = centerY + radiusPixels * Math.sin(angle);
        
        // Consistent gap from seat circle edge to name label
        // Seat circle = 44px, radius = 22px, gap = 4px from edge
        const angleDegrees = (angle * 180) / Math.PI;
        const circleGapY = 46; // larger gap for top/bottom names in PDF
        const circleGapX = 26; // gap for left/right names
        
        if (angleDegrees >= -100 && angleDegrees <= -80) {
          labelX = x;
          labelY = y - circleGapY;
          textAlign = 'center';
          transform = 'translate(-50%, -50%)';
        } else if (angleDegrees >= 80 && angleDegrees <= 100) {
          labelX = x;
          labelY = y + circleGapY;
          textAlign = 'center';
          transform = 'translate(-50%, -50%)';
        } else if (angleDegrees > -80 && angleDegrees < 80) {
          labelX = x + circleGapX;
          labelY = y;
          textAlign = 'left';
          transform = 'translate(0, -50%)';
        } else {
          labelX = x - circleGapX;
          labelY = y;
          textAlign = 'right';
          transform = 'translate(-100%, -50%)';
        }
      }
      
      seats.push({
        number: guest.seat_no || i + 1,
        guest,
        x,
        y,
        labelX,
        labelY,
        textAlign,
        transform,
        angle
      });
    }
    
    return seats;
  };

  const seats = arrangeSeats();
  
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const time = now.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    return `${date} - ${time}`;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const ordinalSuffix = getOrdinalSuffix(day);
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${day}${ordinalSuffix} ${month} ${year}`;
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const eventName = event?.name || 'Event';

  // Pre-compute header details for Running Sheet style
  const fmtOrdinalDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const ordinal = (n: number) => { const s = ['th','st','nd','rd']; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dayName} ${ordinal(day)}, ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };
  const fmtTimeDisplay = (t: string | null | undefined) => {
    if (!t) return 'TBD';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const dh = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${dh}:${m} ${ampm}`;
  };

  const ceremonyDetailLine = event?.ceremony_date
    ? `Ceremony: ${fmtOrdinalDate(event.ceremony_date)} | ${event?.ceremony_venue || 'Venue TBD'} | ${fmtTimeDisplay(event?.ceremony_start_time)} – ${fmtTimeDisplay(event?.ceremony_finish_time)}`
    : '';
  const receptionDetailLine = `Reception: ${fmtOrdinalDate(event?.date)} | ${event?.venue || 'Venue TBD'} | ${fmtTimeDisplay(event?.start_time)} – ${fmtTimeDisplay(event?.finish_time)}`;

  // Pre-compute footer timestamp
  const footerTimestamp = (() => {
    const now = new Date();
    const hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${displayHour}:${String(now.getMinutes()).padStart(2,'0')} ${ampm}`;
  })();

  /**
   * Layout sizes for header/footer match Running Sheet style.
   * The font size setting from the customizer ONLY affects:
   *   - Table name inside the circular table
   *   - Guest names in the guest list
   */
  return `
    <div style="width: 794px; height: 1123px; background: white; font-family: Arial, sans-serif; padding: 48px; box-sizing: border-box; display: flex; flex-direction: column; line-height: 1.4;">
      <!-- Header Section - Running Sheet Style -->
      <div style="text-align: center; margin-bottom: 10px; padding: 10px 0;">
        <!-- Event Name - Large Purple Bold -->
        <div style="font-size: 22px; font-weight: 700; color: #6d28d9; text-align: center; margin-bottom: 4px; line-height: 1.5;">
          ${eventName}
        </div>
        <!-- Subtitle with guest count -->
        <div style="font-size: 16px; font-weight: 400; color: #222; text-align: center; margin-top: 4px;">
          Individual Table Charts – ${sortedGuests.length} ${sortedGuests.length === 1 ? 'Guest' : 'Guests'}
        </div>
        <!-- Ceremony & Reception Details -->
        <div style="text-align: center; margin-top: 4px; margin-bottom: 6px;">
          ${ceremonyDetailLine ? `<div style="color:#555;font-size:12px;margin-top:2px;">${ceremonyDetailLine}</div>` : ''}
          <div style="color:#555;font-size:12px;margin-top:2px;">${receptionDetailLine}</div>
        </div>
        <!-- Purple Divider -->
        <div style="border-top: 2px solid #6d28d9; margin: 8px 0 14px 0;"></div>
      </div>

      <!-- Table Visualization -->
      ${settings.tableShape === 'long' ? `
        <!-- LONG TABLE LAYOUT - Matching preview exactly -->
        ${(() => {
          const endSeatsEnabled = settings.enableEndSeats;
          const seatsPerEnd = settings.endSeatsCount || 1;
          
          // Reserve guests for end seats if enabled
          const totalEndSeats = endSeatsEnabled ? seatsPerEnd * 2 : 0;
          const sideGuests = sortedGuests.slice(0, sortedGuests.length - totalEndSeats);
          const endGuests = sortedGuests.slice(sortedGuests.length - totalEndSeats);
          
          // Split side guests: first half to left side, second half to right side
          const halfPoint = Math.ceil(sideGuests.length / 2);
          const leftSide = sideGuests.slice(0, halfPoint).map((guest, idx) => ({ guest, seatNumber: idx + 1 }));
          const rightSide = sideGuests.slice(halfPoint).map((guest, idx) => ({ guest, seatNumber: halfPoint + idx + 1 }));
          
          // Assign end seats
          const topEnd: { guest: any; seatNumber: number }[] = [];
          const bottomEnd: { guest: any; seatNumber: number }[] = [];
          
          if (endSeatsEnabled && endGuests.length > 0) {
            const baseSeatNumber = sideGuests.length + 1;
            endGuests.forEach((guest, index) => {
              const seatNumber = baseSeatNumber + index;
              if (index < seatsPerEnd) {
                topEnd.push({ guest, seatNumber });
              } else {
                bottomEnd.push({ guest, seatNumber });
              }
            });
          }
          
          // Calculate scaling based on guest count - MATCHING PREVIEW
          const count = sortedGuests.length;
          const chairSize = count <= 40 ? 40 : count <= 60 ? 34 : count <= 80 ? 28 : 22;
          const fontSize = count <= 40 ? 14 : count <= 60 ? 12 : count <= 80 ? 10 : 9;
          
          // Use larger table height for proper spacing - matching preview
          const tableHeight = 680;
          const tableWidth = 120;
          const chairGap = 28; // Fixed gap between chair and table edge
          
          return `
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <div style="position: relative; width: 100%; height: 730px; display: flex; align-items: center; justify-content: center;">
              <!-- Long Table Rectangle - Centered -->
              <div style="
                position: relative; 
                width: ${tableWidth}px; 
                height: ${tableHeight}px; 
                border: 2px solid #374151; 
                background: #f9fafb; 
                border-radius: 8px;
              ">
                <!-- Rotated Table Name Inside -->
                <div style="
                  position: absolute;
                  left: 50%;
                  top: 50%;
                  transform: translate(-50%, -50%) rotate(-90deg);
                  white-space: nowrap;
                  font-size: ${Math.max(14, 24 - count / 5)}px;
                  font-weight: 700;
                  color: #4b5563;
                  text-align: center;
                ">
                  <div>TABLE</div>
                  <div>${table.table_no ?? table.name}</div>
                </div>
                
                <!-- Left Side Chairs Container - Positioned outside table with ABSOLUTE positioning (matches preview) -->
                <div style="
                  position: absolute;
                  left: 0;
                  top: 16px;
                  bottom: 16px;
                  transform: translateX(calc(-100% - ${chairGap}px));
                ">
                  ${leftSide.map((item, index) => {
                    const totalGuests = leftSide.length;
                    const topPercent = totalGuests === 1 ? 50 : (index / (totalGuests - 1)) * 100;
                    return `
                    <div style="
                      position: absolute;
                      top: ${topPercent}%;
                      right: 0;
                      transform: translateY(-50%);
                      display: flex;
                      align-items: center;
                      gap: 4px;
                    ">
                      <!-- Full Guest Name + Dietary Text - Left of Chair -->
                      <span style="
                        text-align: right;
                        font-weight: 500;
                        font-size: ${fontSize}px;
                        white-space: nowrap;
                      ">${item.guest.first_name} ${item.guest.last_name}${settings.includeDietary && item.guest.dietary && item.guest.dietary !== 'NA' ? `<span style="color: #7c3aed; font-weight: 700; margin-left: 4px;">- ${item.guest.dietary}</span>` : ''}</span>
                      <!-- Chair Circle -->
                      <div style="
                        width: ${chairSize}px;
                        height: ${chairSize}px;
                        border-radius: 50%;
                        background: white;
                        border: 1px solid black;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: ${fontSize}px;
                        flex-shrink: 0;
                      ">${settings.showSeatNumbers ? item.seatNumber : ''}</div>
                    </div>
                  `}).join('')}
                </div>
                
                <!-- Right Side Chairs Container - Positioned outside table with ABSOLUTE positioning (matches preview) -->
                <div style="
                  position: absolute;
                  right: 0;
                  top: 16px;
                  bottom: 16px;
                  transform: translateX(calc(100% + ${chairGap}px));
                ">
                  ${rightSide.map((item, index) => {
                    const totalGuests = rightSide.length;
                    const topPercent = totalGuests === 1 ? 50 : (index / (totalGuests - 1)) * 100;
                    return `
                    <div style="
                      position: absolute;
                      top: ${topPercent}%;
                      left: 0;
                      transform: translateY(-50%);
                      display: flex;
                      align-items: center;
                      gap: 4px;
                    ">
                      <!-- Chair Circle -->
                      <div style="
                        width: ${chairSize}px;
                        height: ${chairSize}px;
                        border-radius: 50%;
                        background: white;
                        border: 1px solid black;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: ${fontSize}px;
                        flex-shrink: 0;
                      ">${settings.showSeatNumbers ? item.seatNumber : ''}</div>
                      <!-- Full Guest Name + Dietary Text - Right of Chair -->
                      <span style="
                        text-align: left;
                        font-weight: 500;
                        font-size: ${fontSize}px;
                        white-space: nowrap;
                      ">${item.guest.first_name} ${item.guest.last_name}${settings.includeDietary && item.guest.dietary && item.guest.dietary !== 'NA' ? `<span style="color: #7c3aed; font-weight: 700; margin-left: 4px;">- ${item.guest.dietary}</span>` : ''}</span>
                    </div>
                  `}).join('')}
                </div>
                
                ${endSeatsEnabled && topEnd.length > 0 ? `
                <!-- Top End Seats - positioned higher to prevent overlap -->
                <div style="
                  position: absolute;
                  left: 50%;
                  top: -60px;
                  transform: translateX(-50%);
                  display: flex;
                  align-items: flex-end;
                ">
                  ${topEnd.length === 1 ? `
                    <!-- Single seat - centered with name above, dietary below name, chair at bottom -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                      <span style="text-align: center; font-weight: 500; font-size: ${fontSize}px; white-space: nowrap;">
                        ${topEnd[0].guest.first_name} ${topEnd[0].guest.last_name}
                      </span>
                      ${settings.includeDietary && topEnd[0].guest.dietary && topEnd[0].guest.dietary !== 'NA' ? `
                        <span style="color: #7c3aed; font-weight: 700; font-size: ${fontSize}px; white-space: nowrap;">- ${topEnd[0].guest.dietary}</span>
                      ` : ''}
                      <div style="width: ${chairSize}px; height: ${chairSize}px; border-radius: 50%; background: white; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${fontSize}px;">
                        ${settings.showSeatNumbers ? topEnd[0].seatNumber : ''}
                      </div>
                    </div>
                  ` : `
                    <!-- Two seats - chairs close together in center, names on outer sides -->
                    <div style="display: flex; align-items: flex-end; gap: 4px;">
                      <!-- First guest - name+dietary on left, chair on right -->
                      <div style="display: flex; align-items: flex-end; gap: 8px;">
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                          <span style="text-align: right; font-weight: 500; font-size: ${fontSize}px; white-space: nowrap;">
                            ${topEnd[0].guest.first_name} ${topEnd[0].guest.last_name}
                          </span>
                          ${settings.includeDietary && topEnd[0].guest.dietary && topEnd[0].guest.dietary !== 'NA' ? `
                            <span style="color: #7c3aed; font-weight: 700; font-size: ${fontSize}px; white-space: nowrap; text-align: right;">- ${topEnd[0].guest.dietary}</span>
                          ` : ''}
                        </div>
                        <div style="width: ${chairSize}px; height: ${chairSize}px; border-radius: 50%; background: white; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${fontSize}px;">
                          ${settings.showSeatNumbers ? topEnd[0].seatNumber : ''}
                        </div>
                      </div>
                      <!-- Second guest - chair on left, name+dietary on right -->
                      <div style="display: flex; align-items: flex-end; gap: 8px;">
                        <div style="width: ${chairSize}px; height: ${chairSize}px; border-radius: 50%; background: white; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${fontSize}px;">
                          ${settings.showSeatNumbers ? topEnd[1].seatNumber : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                          <span style="text-align: left; font-weight: 500; font-size: ${fontSize}px; white-space: nowrap;">
                            ${topEnd[1].guest.first_name} ${topEnd[1].guest.last_name}
                          </span>
                          ${settings.includeDietary && topEnd[1].guest.dietary && topEnd[1].guest.dietary !== 'NA' ? `
                            <span style="color: #7c3aed; font-weight: 700; font-size: ${fontSize}px; white-space: nowrap; text-align: left;">- ${topEnd[1].guest.dietary}</span>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  `}
                </div>
                ` : ''}
                
                ${endSeatsEnabled && bottomEnd.length > 0 ? `
                <!-- Bottom End Seats - positioned lower to prevent overlap -->
                <div style="
                  position: absolute;
                  left: 50%;
                  bottom: -60px;
                  transform: translateX(-50%);
                  display: flex;
                  align-items: flex-start;
                ">
                  ${bottomEnd.length === 1 ? `
                    <!-- Single seat - centered with chair at top, dietary below, name at bottom -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                      <div style="width: ${chairSize}px; height: ${chairSize}px; border-radius: 50%; background: white; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${fontSize}px;">
                        ${settings.showSeatNumbers ? bottomEnd[0].seatNumber : ''}
                      </div>
                      <span style="text-align: center; font-weight: 500; font-size: ${fontSize}px; white-space: nowrap;">
                        ${bottomEnd[0].guest.first_name} ${bottomEnd[0].guest.last_name}
                      </span>
                      ${settings.includeDietary && bottomEnd[0].guest.dietary && bottomEnd[0].guest.dietary !== 'NA' ? `
                        <span style="color: #7c3aed; font-weight: 700; font-size: ${fontSize}px; white-space: nowrap;">- ${bottomEnd[0].guest.dietary}</span>
                      ` : ''}
                    </div>
                  ` : `
                    <!-- Two seats - chairs close together in center, names on outer sides -->
                    <div style="display: flex; align-items: flex-start; gap: 4px;">
                      <!-- First guest - name+dietary on left (below), chair on right -->
                      <div style="display: flex; align-items: flex-start; gap: 8px;">
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                          <span style="text-align: right; font-weight: 500; font-size: ${fontSize}px; white-space: nowrap;">
                            ${bottomEnd[0].guest.first_name} ${bottomEnd[0].guest.last_name}
                          </span>
                          ${settings.includeDietary && bottomEnd[0].guest.dietary && bottomEnd[0].guest.dietary !== 'NA' ? `
                            <span style="color: #7c3aed; font-weight: 700; font-size: ${fontSize}px; white-space: nowrap; text-align: right;">- ${bottomEnd[0].guest.dietary}</span>
                          ` : ''}
                        </div>
                        <div style="width: ${chairSize}px; height: ${chairSize}px; border-radius: 50%; background: white; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${fontSize}px;">
                          ${settings.showSeatNumbers ? bottomEnd[0].seatNumber : ''}
                        </div>
                      </div>
                      <!-- Second guest - chair on left, name+dietary on right -->
                      <div style="display: flex; align-items: flex-start; gap: 8px;">
                        <div style="width: ${chairSize}px; height: ${chairSize}px; border-radius: 50%; background: white; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${fontSize}px;">
                          ${settings.showSeatNumbers ? bottomEnd[1].seatNumber : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                          <span style="text-align: left; font-weight: 500; font-size: ${fontSize}px; white-space: nowrap;">
                            ${bottomEnd[1].guest.first_name} ${bottomEnd[1].guest.last_name}
                          </span>
                          ${settings.includeDietary && bottomEnd[1].guest.dietary && bottomEnd[1].guest.dietary !== 'NA' ? `
                            <span style="color: #7c3aed; font-weight: 700; font-size: ${fontSize}px; white-space: nowrap; text-align: left;">- ${bottomEnd[1].guest.dietary}</span>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  `}
                </div>
                ` : ''}
              </div>
            </div>
          </div>
          `;
        })()}
      ` : `
        <!-- ROUND/SQUARE TABLE LAYOUT -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; margin-bottom: 30px;">
        <div style="position: relative; width: 500px; height: 450px;">
          <!-- Table -->
          <div style="
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 280px;
            height: 280px;
            border: 1px solid #333;
            background: #f9f9f9;
            ${settings.tableShape === 'round' ? 'border-radius: 50%;' : 'border-radius: 8px;'}
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #000000;
            flex-direction: column;
            line-height: 1.2;
            text-rendering: optimizeLegibility;
            ">
            <div style="padding: 2px 0; display: inline-block; vertical-align: baseline; font-size: ${getTitleSize(settings.fontSize)}px;">TABLE</div>
            <div style="padding: 2px 0; display: inline-block; vertical-align: baseline; font-size: ${getAutoFitFontSize(String(table.table_no ?? table.name), getTitleSize(settings.fontSize), 250)}px;">${table.table_no ?? table.name}</div>
          </div>

          <!-- Seats -->
          ${seats.map(seat => {
            // Auto-scale font for top/bottom sides to prevent overlap
            const getAutoScaledFontSize = () => {
              if (settings.tableShape !== 'square') return 11;
              
              // Check if this is a top or bottom side (textAlign === 'center')
              if (seat.textAlign !== 'center') return 11;
              
              const guestCount = sortedGuests.length;
              const guestsPerSide = Math.ceil(guestCount / 4);
              
              // Calculate available width per name on horizontal sides
              const containerWidth = 500; // px
              const usableWidth = containerWidth * 0.85; // 85% usable
              const widthPerName = usableWidth / guestsPerSide;
              
              // Estimate name width (first name only)
              const firstName = seat.guest?.first_name || '';
              const baseFontPt = 11;
              const charWidthRatio = 0.6;
              const estimatedWidth = firstName.length * baseFontPt * charWidthRatio;
              
              if (estimatedWidth <= widthPerName) return baseFontPt;
              
              // Scale down the font
              const scaleFactor = Math.min(widthPerName / estimatedWidth, 1);
              return Math.max(baseFontPt * scaleFactor, 8);
            };
            
            const scaledFontPt = getAutoScaledFontSize();
            
            return `
            <!-- Seat Circle with thin black border - 44px for tight spacing -->
            <div style="
              position: absolute;
              left: ${seat.x}px;
              top: ${seat.y}px;
              transform: translate(-50%, -50%);
              width: 44px;
              height: 44px;
              border: 1px solid #000;
              border-radius: 50%;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
              ${settings.showSeatNumbers ? `<span style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-weight: bold;
                font-size: 12px;
              ">${seat.number}</span>` : ''}
            </div>

            <!-- Guest Name - Side-aware positioning with auto-scale for top/bottom -->
            ${seat.guest && settings.includeNames ? `
              <div style="
                position: absolute;
                left: ${seat.labelX}px;
                top: ${seat.labelY + 2}px;
                transform: ${seat.transform};
                text-align: ${seat.textAlign};
                font-size: ${settings.largerTableNames ? scaledFontPt * 1.25 : scaledFontPt}pt;
                font-weight: ${settings.isBold ? '700' : '400'};
                font-style: ${settings.isItalic ? 'italic' : 'normal'};
                text-decoration: ${settings.isUnderline ? 'underline' : 'none'};
                color: #000000;
                line-height: 1.4;
                white-space: nowrap;
                overflow: hidden;
                max-width: 95px;
                padding: 4px;
                display: inline-block;
                vertical-align: baseline;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              " title="${seat.guest.first_name} ${seat.guest.last_name}">
                ${seat.guest.first_name}
              </div>
            ` : ''}
          `}).join('')}
        </div>
      </div>
      `}

      <!-- Guest List - Auto-scaled font size: ${autoFitGuestListFontPt.toFixed(1)}pt -->
      ${settings.includeGuestList && settings.tableShape !== 'long' ? (() => {
        const isBold = settings.isBold;
        const isItalic = settings.isItalic;
        const isUnderline = settings.isUnderline;
        const nameWeight = isBold ? '700' : '400';
        const nameItalic = isItalic ? 'italic' : 'normal';
        const nameDecoration = isUnderline ? 'underline' : 'none';
        const textStyleStr = `font-weight: ${nameWeight}; font-style: ${nameItalic}; text-decoration: ${nameDecoration};`;
        return `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; font-size: ${autoFitGuestListFontPt}pt; line-height: 1.35;">
            <!-- Left Column (odd indices: 0, 2, 4...) -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
              ${sortedGuests.filter((_, index) => index % 2 === 0).map((guest) => {
                const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                const relationText = settings.includeRelation && guest.relation_display && guest.relation_display !== 'Not Assigned' ? ` <span style="color: #888;">(${(guest.relation_display || '').replace(/ \/ /g, '/')})</span>` : '';
                return `
                  <div style="display: flex; align-items: flex-start; padding: 2px 0; line-height: 1.5; min-height: ${scaledRowHeight}px;">
                    <span style="width: 20px; text-align: left; flex-shrink: 0;">${actualIndex + 1}.</span>
                    <span style="word-wrap: break-word; text-align: left;">
                      <span style="${textStyleStr}">${guest.first_name} ${guest.last_name}</span>${settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? ` <span style="color: #6D28D9; font-weight: 700; ${textStyleStr}">- ${guest.dietary}</span>` : ''}${relationText}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
            <!-- Right Column (even indices: 1, 3, 5...) -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px; margin-left: 16px;">
              ${sortedGuests.filter((_, index) => index % 2 === 1).map((guest) => {
                const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                const relationText = settings.includeRelation && guest.relation_display && guest.relation_display !== 'Not Assigned' ? ` <span style="color: #888;">(${(guest.relation_display || '').replace(/ \/ /g, '/')})</span>` : '';
                return `
                  <div style="display: flex; align-items: flex-start; padding: 2px 0; line-height: 1.5; min-height: ${scaledRowHeight}px;">
                    <span style="width: 20px; text-align: left; flex-shrink: 0;">${actualIndex + 1}.</span>
                    <span style="word-wrap: break-word; text-align: left;">
                      <span style="${textStyleStr}">${guest.first_name} ${guest.last_name}</span>${settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? ` <span style="color: #6D28D9; font-weight: 700; ${textStyleStr}">- ${guest.dietary}</span>` : ''}${relationText}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `; })() : ''}

      <!-- Footer - Logo centered, page/date below -->
      ${settings.showLogo ? `
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: auto; padding: 8px 0 4px 0;">
          <img 
            src="${weddingWaitressLogoFull}" 
            alt="Wedding Waitress" 
            style="width: 159px; height: 45px; object-fit: contain;"
          />
          <div style="display: flex; justify-content: space-between; width: 100%; margin-top: 2px;">
            <span style="font-size: 7pt; color: #000;">Page ${settings.currentTableIndex || 1} of ${settings.totalTables || 1}</span>
            <span style="font-size: 7pt; color: #000;">Generated: ${footerTimestamp}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
};