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
      title: `TABLE ${table.table_no || 'Unknown'}`
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
      
      const angle = ((i - 1) / seatCount) * 2 * Math.PI - Math.PI / 2; // Start from top
      
      // Use exact same radius percentages as IndividualTableChartPreview
      let radius = settings.tableShape === 'round' ? 37 : 40;
      
      // Move seats 1 and 6 outward by additional 2.5% to avoid touching table
      if (settings.tableShape === 'round' && (i === 1 || i === 6)) {
        radius = 39.5;
      }
      
      // For square tables, move specific chairs further out to avoid table overlap
      if (settings.tableShape === 'square' && [2, 5, 7, 10].includes(i)) {
        radius = 48;
      }
      
      // Calculate position as percentage of container, then convert to pixels
      const xPercent = 50 + radius * Math.cos(angle);
      const yPercent = 50 + radius * Math.sin(angle);
      const x = (xPercent / 100) * containerWidth;
      const y = (yPercent / 100) * containerHeight;
      
      // Calculate label position
      let labelX = x;
      let labelY = y;
      let textAlign = 'center';
      let transform = 'translate(-50%, -50%)';
      
      if (settings.tableShape === 'square' && guest) {
        const side = getChairSide(angle);
        const chairSize = 14; // 56px / 4 = 14% (w-14 h-14)
        const offset = 3.5; // 14px offset converted to percentage
        
        // Convert percentage to pixels
        const chairSizePixels = (chairSize / 100) * Math.min(containerWidth, containerHeight);
        const offsetPixels = (offset / 100) * Math.min(containerWidth, containerHeight);
        
        // Increase offset by +6mm for better separation
        const additionalOffset = (5.7 / 100) * Math.min(containerWidth, containerHeight); // 6mm in pixels
        const totalOffsetPixels = offsetPixels + additionalOffset;
        
        switch (side) {
          case 'right':
            labelX = x + chairSizePixels/2 + totalOffsetPixels;
            labelY = y;
            textAlign = 'left';
            transform = 'translate(0, -50%)';
            break;
          case 'left':
            labelX = x - chairSizePixels/2 - totalOffsetPixels;
            labelY = y;
            textAlign = 'right';
            transform = 'translate(-100%, -50%)';
            break;
          case 'top':
            labelX = x;
            labelY = y - chairSizePixels/2 - totalOffsetPixels;
            textAlign = 'center';
            transform = 'translate(-50%, -100%)';
            break;
          case 'bottom':
            labelX = x;
            labelY = y + chairSizePixels/2 + totalOffsetPixels;
            textAlign = 'center';
            transform = 'translate(-50%, 0)';
            break;
        }
      } else if (settings.tableShape === 'round' && guest) {
        // Position labels further outward (+6mm additional gap from seat edge)
        const chairRadius = i === 1 || i === 6 ? 39.5 : 37;
        const labelOffset = 14.2; // Increased by 6mm (8.5 + 5.7)
        const labelRadiusPercent = chairRadius + labelOffset;
        const labelRadiusPixels = (labelRadiusPercent / 100) * Math.min(containerWidth, containerHeight);
        
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
      <div style="text-align: center; margin-bottom: 25px; padding: 10px 0;">
        <!-- Title -->
        <div style="font-size: 18pt; font-weight: 700; color: #000000; text-align: center; margin-bottom: 15px; line-height: 1.5; padding: 5px 0;">
          ${event.venue_name ? event.venue_name + ' - ' : ''}Table Seating Arrangements
        </div>
        <!-- Event name and date -->
        <div style="font-size: 18pt; font-weight: 700; color: #000000; line-height: 1.3; padding: 8px 0; display: inline-block; vertical-align: baseline;">
          ${eventName}${event?.date ? ' - ' + formatEventDate(event.date) : ''}
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
            ${seat.guest ? `
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
          <h3 style="font-size: 16pt; font-weight: 700; color: #000000; margin-bottom: 15px; padding: 5px 0; line-height: 1.4; text-align: center; text-decoration: underline;">
            Guests on this Table & Dietary - Printed on - ${getCurrentDateTime()}
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 11pt; line-height: 1.7; padding: 5px 0; text-align: center;">
            ${sortedGuests.map((guest, index) => `
              <div style="display: flex; align-items: flex-start; justify-content: center; padding: 2px 0; margin: 0; line-height: 1.7; word-wrap: break-word; overflow-wrap: break-word; min-height: 20px;">
                <span style="display: inline-block; vertical-align: baseline; margin: 0; padding: 0; line-height: inherit;">
                  ${index + 1}. ${guest.first_name} ${guest.last_name}${settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? ` - <span style="color: #22c55e; font-weight: 700;">${guest.dietary}</span>` : ''}
                </span>
              </div>
            `).join('')}
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