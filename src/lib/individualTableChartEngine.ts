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
      title: `TABLE ${table.table_no || 'Unknown'}`,
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
      title: `TABLE ${table.table_no || 'Unknown'}`,
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
      case 'small': return '20pt';
      case 'large': return '28pt';
      default: return '24pt';
    }  
  };

  // Helper function to determine chair side for square tables
  const getChairSide = (angle: number) => {
    const normalizedAngle = ((angle + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    
    if (normalizedAngle >= 7 * Math.PI / 4 || normalizedAngle < Math.PI / 4) return 'top';
    if (normalizedAngle >= Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) return 'right';
    if (normalizedAngle >= 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) return 'bottom';
    return 'left';
  };

  // Arrange seats around table - Using exact same logic as IndividualTableChartPreview
  const arrangeSeats = () => {
    const seatCount = table.limit_seats;
    const seats = [];
    
    // Fixed container dimensions - match IndividualTableChartPreview exactly
    const containerWidth = 500;
    const containerHeight = 450;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    for (let i = 1; i <= seatCount; i++) {
      let guest = sortedGuests.find(g => g.seat_no === i);
      
      // If no guest assigned to this seat, try to assign unassigned guests
      if (!guest) {
        guest = sortedGuests.find(g => !g.seat_no || g.seat_no === 0);
        if (guest) {
          guest = { ...guest, seat_no: i };
        }
      }
      
      let x, y, labelX, labelY, textAlign, transform, angle;
      
      if (settings.tableShape === 'square') {
        // SQUARE TABLE: Position chairs evenly along the 4 sides
        const seatsPerSide = Math.ceil(seatCount / 4);
        const side = Math.floor((i - 1) / seatsPerSide); // 0=top, 1=right, 2=bottom, 3=left
        const positionOnSide = (i - 1) % seatsPerSide;
        const sideFraction = (positionOnSide + 1) / (seatsPerSide + 1); // Evenly spaced
        
        const chairSize = 14; // 56px / 4 = 14% (w-14 h-14)
        const offset = 2.8; // 14px offset for labels
        
        // Convert percentage to pixels
        const chairSizePixels = (chairSize / 100) * Math.min(containerWidth, containerHeight);
        const offsetPixels = (offset / 100) * Math.min(containerWidth, containerHeight);
        
        switch (side) {
          case 0: // Top
            x = ((20 + (sideFraction * 60)) / 100) * containerWidth;
            y = (10 / 100) * containerHeight;
            labelX = x;
            labelY = y - chairSizePixels/2 - offsetPixels;
            textAlign = 'center';
            transform = 'translate(-50%, -100%)';
            angle = -Math.PI / 2;
            break;
          case 1: // Right
            x = (85 / 100) * containerWidth;
            y = ((20 + (sideFraction * 60)) / 100) * containerHeight;
            labelX = x + chairSizePixels/2 + offsetPixels;
            labelY = y;
            textAlign = 'left';
            transform = 'translate(0, -50%)';
            angle = 0;
            break;
          case 2: // Bottom
            x = ((20 + (sideFraction * 60)) / 100) * containerWidth;
            y = (90 / 100) * containerHeight;
            labelX = x;
            labelY = y + chairSizePixels/2 + offsetPixels;
            textAlign = 'center';
            transform = 'translate(-50%, 0)';
            angle = Math.PI / 2;
            break;
          case 3: // Left
          default:
            x = (15 / 100) * containerWidth;
            y = ((20 + (sideFraction * 60)) / 100) * containerHeight;
            labelX = x - chairSizePixels/2 - offsetPixels;
            labelY = y;
            textAlign = 'right';
            transform = 'translate(-100%, -50%)';
            angle = Math.PI;
            break;
        }
        
        // Override label position if no guest
        if (!guest) {
          labelX = x;
          labelY = y;
          transform = 'translate(-50%, -50%)';
        }
        
      } else {
        // ROUND TABLE: Use pixel-based positioning for perfect circle
        angle = ((i - 1) / seatCount) * 2 * Math.PI - Math.PI / 2; // Start from top
        
        // Use smaller dimension to ensure perfect circle (not ellipse)
        const circleBaseDimension = Math.min(containerWidth, containerHeight);
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        const radiusPixels = (37 / 100) * circleBaseDimension;
        
        // Calculate position directly in pixels using true circular geometry
        x = centerX + radiusPixels * Math.cos(angle);
        y = centerY + radiusPixels * Math.sin(angle);
        
        // Calculate label position
        labelX = x;
        labelY = y;
        textAlign = 'center';
        transform = 'translate(-50%, -50%)';
        
        if (guest) {
          // Position labels further outward - match preview offset
          const labelOffsetPercent = 12.5; // Match preview exactly
          const labelRadiusPixels = ((37 + labelOffsetPercent) / 100) * circleBaseDimension;
          
          labelX = centerX + labelRadiusPixels * Math.cos(angle);
          labelY = centerY + labelRadiusPixels * Math.sin(angle);
          
          // Determine text alignment based on angle (hemisphere)
          const angleDegrees = (angle * 180) / Math.PI;
          if (angleDegrees >= -90 && angleDegrees <= 90) {
            textAlign = 'left';
            transform = 'translate(0, -50%)';
          } else {
            textAlign = 'right';
            transform = 'translate(-100%, -50%)';
          }
        }
      }
      
      seats.push({
        number: i,
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

  return `
    <div style="width: 794px; height: 1123px; background: white; font-family: Arial, sans-serif; padding: 40px; box-sizing: border-box; display: flex; flex-direction: column; line-height: 1.4;">
      <!-- Header Section -->
      <div style="text-align: center; margin-bottom: 10px; padding: 10px 0;">
        <!-- Event Name - Purple and Bold -->
        <div style="font-size: 14pt; font-weight: 700; color: #6D28D9; text-align: center; margin-bottom: 8px; line-height: 1.5;">
          ${eventName}
        </div>
        <!-- Title and Date with Day of Week -->
        <div style="font-size: 11pt; font-weight: 700; color: #000000; text-align: center; margin-bottom: 8px; line-height: 1.3;">
          Table Seating Arrangements – ${event?.date ? (() => {
            const d = new Date(event.date);
            const day = d.getDate();
            const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
            const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
            const month = d.toLocaleDateString('en-GB', { month: 'long' });
            const year = d.getFullYear();
            return `${weekday} ${day}${suffix}, ${month} ${year}`;
          })() : ''}
        </div>
        <!-- Venue, Tables, Page Info and Timestamp -->
        <div style="font-size: 12pt; color: #000000; text-align: center; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #000000;">
          ${event?.venue || 'Venue'} – Total Tables: ${settings.totalTables || 1} – Page ${settings.currentTableIndex || 1} of ${settings.totalTables || 1} – Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} Time: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>

      <!-- Table Visualization -->
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
            font-size: ${getTitleSize(settings.fontSize)};
            font-weight: 700;
            color: #000000;
            flex-direction: column;
            line-height: 1.2;
            text-rendering: optimizeLegibility;
            ">
            <div style="padding: 2px 0; display: inline-block; vertical-align: baseline;">TABLE</div>
            <div style="padding: 2px 0; display: inline-block; vertical-align: baseline;">${table.table_no}</div>
          </div>

          <!-- Seats -->
          ${seats.map(seat => `
            <!-- Seat Circle with thin black border -->
            <div style="
              position: absolute;
              left: ${seat.x}px;
              top: ${seat.y}px;
              transform: translate(-50%, -50%);
              width: 56px;
              height: 56px;
              border: 1px solid #000;
              border-radius: 50%;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
              ${settings.showSeatNumbers ? seat.number : ''}
            </div>

            <!-- Guest Name - Side-aware positioning -->
            ${seat.guest && settings.includeNames ? `
              <div style="
                position: absolute;
                left: ${seat.labelX}px;
                top: ${seat.labelY}px;
                transform: ${seat.transform};
                text-align: ${seat.textAlign};
                font-size: 11pt;
                font-weight: 700;
                color: #000000;
                line-height: 1.6;
                word-wrap: break-word;
                hyphens: auto;
                max-height: 3.2em;
                overflow: hidden;
                max-width: 95px;
                padding: 8px;
                min-height: 1.6em;
                display: inline-block;
                vertical-align: baseline;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              " title="${seat.guest.first_name} ${seat.guest.last_name}">
                ${seat.guest.first_name}
              </div>
            ` : ''}
          `).join('')}
        </div>
      </div>

      <!-- Guest List -->
      ${settings.includeGuestList ? `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16pt; font-weight: 600; color: #000000; margin-bottom: 15px; padding: 5px 0; line-height: 1.4; text-align: center; text-decoration: underline;">
            Guests on this Table & Meal Selection
          </h3>
          <div style="display: flex; font-size: 11pt; line-height: 1.35;">
            <!-- Left Column (odd indices: 0, 2, 4...) -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              ${sortedGuests.filter((_, index) => index % 2 === 0).map((guest) => {
                const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                return `
                  <div style="display: flex; align-items: flex-start; padding: 4px 0; line-height: 1.7; min-height: 20px;">
                    <span style="width: 24px; text-align: left; flex-shrink: 0;">${actualIndex + 1}.</span>
                    <span style="word-wrap: break-word; text-align: left;">
                      <span style="font-weight: 700;">${guest.first_name} ${guest.last_name}</span>${settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? ` <span style="color: #6D28D9; font-weight: 700;">- ${guest.dietary}</span>` : ''}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
            <!-- Right Column (even indices: 1, 3, 5...) -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; margin-left: 16px;">
              ${sortedGuests.filter((_, index) => index % 2 === 1).map((guest) => {
                const actualIndex = sortedGuests.findIndex(g => g.id === guest.id);
                return `
                  <div style="display: flex; align-items: flex-start; padding: 4px 0; line-height: 1.7; min-height: 20px;">
                    <span style="width: 24px; text-align: left; flex-shrink: 0;">${actualIndex + 1}.</span>
                    <span style="word-wrap: break-word; text-align: left;">
                      <span style="font-weight: 700;">${guest.first_name} ${guest.last_name}</span>${settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? ` <span style="color: #6D28D9; font-weight: 700;">- ${guest.dietary}</span>` : ''}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Logo -->
      ${settings.showLogo ? `
        <div style="display: flex; justify-content: center; margin-top: auto; padding: 10px 0;">
          <img 
            src="${weddingWaitressLogoFull}" 
            alt="Wedding Waitress" 
            style="height: 48px; object-fit: contain;"
          />
        </div>
      ` : ''}
    </div>
  `;
};