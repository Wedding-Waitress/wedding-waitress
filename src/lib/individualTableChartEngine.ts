import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { IndividualChartSettings } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { format } from 'date-fns';

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
    // Convert to canvas
    const canvas = await html2canvas(container, {
      width: 794,
      height: 1123,
      scale: 2, // Higher quality
      useCORS: true,
      backgroundColor: '#ffffff'
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
    const canvas = await html2canvas(container, {
      width: 794,
      height: 1123,
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
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
 * Generate SVG content for individual table chart
 */
const generateIndividualTableSVG = (
  settings: IndividualChartSettings,
  table: TableWithGuestCount,
  guests: Guest[],
  event: any
): string => {
  const tableGuests = guests.filter(guest => guest.table_id === table.id);
  const sortedGuests = tableGuests.sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));

  // Get font sizes
  const getFontSize = (size: string) => {
    switch (size) {
      case 'small': return '12px';
      case 'large': return '18px';
      default: return '14px';
    }
  };

  const getTitleSize = (size: string) => {
    switch (size) {
      case 'small': return '24px';
      case 'large': return '36px';
      default: return '28px';
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

  // Arrange seats around table - Updated to match preview
  const arrangeSeats = () => {
    const seatCount = table.limit_seats;
    const seats = [];
    
    for (let i = 1; i <= seatCount; i++) {
      let guest = sortedGuests.find(g => g.seat_no === i);
      
      // If no guest assigned to this seat, try to assign unassigned guests
      if (!guest) {
        guest = sortedGuests.find(g => !g.seat_no || g.seat_no === 0);
        if (guest) {
          guest = { ...guest, seat_no: i };
        }
      }
      
      const angle = ((i - 1) / seatCount) * 2 * Math.PI - Math.PI / 2;
      
      // Reduced chair radius for round tables (closer to table)
      let radius = settings.tableShape === 'round' ? 125 : 130;
      
      // Move seats 1 and 6 outward by additional 10px to avoid touching table
      if (settings.tableShape === 'round' && (i === 1 || i === 6)) {
        radius = 135;
      }
      
      // For square tables, move specific chairs further out to avoid table overlap
      if (settings.tableShape === 'square' && [2, 5, 7, 10].includes(i)) {
        radius = 160; // Move these chairs further out (equivalent to 48% in preview)
      }
      
      const centerX = 400;
      const centerY = 320;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Calculate label position for square tables
      let labelX = x;
      let labelY = y;
      let textAlign = 'center';
      let transform = 'translateX(-50%)';
      
      if (settings.tableShape === 'square' && guest) {
        const side = getChairSide(angle);
        const chairRadius = 21; // 42px / 2
        const offset = 14; // 12-16px offset
        
        switch (side) {
          case 'right':
            labelX = x + chairRadius + offset;
            labelY = y;
            textAlign = 'left';
            transform = 'translateY(-50%)';
            break;
          case 'left':
            labelX = x - chairRadius - offset;
            labelY = y;
            textAlign = 'right';
            transform = 'translate(-100%, -50%)';
            break;
          case 'top':
            labelX = x;
            labelY = y - chairRadius - offset;
            textAlign = 'center';
            transform = 'translate(-50%, -100%)';
            break;
          case 'bottom':
            labelX = x;
            labelY = y + chairRadius + offset;
            textAlign = 'center';
            transform = 'translateX(-50%)';
            break;
        }
      } else if (settings.tableShape === 'round' && guest) {
        // Position labels 26px outward from chair edge for round tables (+10px adjustment)
        const chairRadius = 21; // 42px / 2
        const labelOffset = 26;
        const baseRadius = (i === 1 || i === 6) ? 135 : 125; // Account for moved chairs
        const labelRadius = baseRadius + chairRadius + labelOffset; // chair radius + chair size + offset
        labelX = centerX + labelRadius * Math.cos(angle);
        labelY = centerY + labelRadius * Math.sin(angle);
        
        // Determine text alignment based on angle (hemisphere)
        const angleDegrees = (angle * 180) / Math.PI;
        if (angleDegrees >= -90 && angleDegrees <= 90) {
          // Right hemisphere - left align text
          textAlign = 'left';
          transform = 'translateY(-50%)';
        } else {
          // Left hemisphere - right align text
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
  const eventDate = event?.date ? format(new Date(event.date), 'PPP') : '';

  return `
    <div style="width: 794px; height: 1123px; background: white; font-family: Arial, sans-serif; padding: 30px; box-sizing: border-box; display: flex; flex-direction: column;">
      <!-- Line 1: Event Info -->
      <div style="text-align: center; margin-bottom: 20px; font-size: 20px; font-weight: 600;">
        <div style="margin-bottom: 4px;">${event.name} • ${event.venue} • ${eventDate}</div>
        <div>Table Seating Arrangements</div>
      </div>


      <!-- Line 3: Table Visualization -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; margin-bottom: 30px;">
        <div style="position: relative; width: 600px; height: 500px;">
          <!-- Table -->
          <div style="
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 260px;
            height: 260px;
            border: 1px solid #333;
            background: #f5f5f5;
            ${settings.tableShape === 'round' ? 'border-radius: 50%;' : 'border-radius: 8px;'}
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${getTitleSize(settings.fontSize)};
            font-weight: bold;
            color: #555;
            ">
            <div style="text-align: center;">TABLE</div>
            <div style="text-align: center;">${table.table_no}</div>
          </div>

          <!-- Seats -->
          ${seats.map(seat => `
            <!-- Seat Circle -->
            <div style="
              position: absolute;
              left: ${seat.x}px;
              top: ${seat.y}px;
              transform: translate(-50%, -50%);
              width: 42px;
              height: 42px;
              border: 1px solid #000;
              border-radius: 50%;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
              ${settings.showSeatNumbers ? seat.number : ''}
            </div>

            <!-- Guest Name - Side-aware positioning for square tables -->
            ${seat.guest ? `
              <div style="
                position: absolute;
                left: ${seat.labelX}px;
                top: ${seat.labelY}px;
                transform: ${seat.transform};
                text-align: ${seat.textAlign};
                font-size: ${getFontSize(settings.fontSize)};
                font-weight: 600;
                background: rgba(255,255,255,0.95);
                padding: 4px 8px;
                border-radius: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 80px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                cursor: help;
              " title="${seat.guest.first_name} ${seat.guest.last_name}">
                ${seat.guest.first_name}
              </div>
            ` : ''}
          `).join('')}
        </div>
      </div>

      <!-- Line 4 & 5: Guest List -->
      ${settings.includeGuestList ? `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: ${getFontSize(settings.fontSize)}; font-weight: bold; margin-bottom: 12px;">
            Guests on this Table & Dietary
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            ${sortedGuests.map((guest, index) => `
              <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${index + 1}. ${guest.first_name} ${guest.last_name}${settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? ` - ${guest.dietary}` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Line 6: Logo -->
      ${settings.showLogo ? `
        <div style="display: flex; justify-content: center; margin-top: auto;">
          <div style="font-size: 12px; color: #666; opacity: 0.6;">
            Wedding Waitress
          </div>
        </div>
      ` : ''}
    </div>
  `;
};