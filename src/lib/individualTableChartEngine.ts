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
      
      const radius = settings.tableShape === 'round' ? 160 : 150; // Moved chairs further outside table
      const centerX = 400;
      const centerY = 320;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Name positioning outside circles - further out for names
      const nameRadius = settings.tableShape === 'round' ? 190 : 180;
      const nameX = centerX + nameRadius * Math.cos(angle);
      const nameY = centerY + nameRadius * Math.sin(angle);
      
      seats.push({
        number: i,
        guest,
        x,
        y,
        nameX,
        nameY,
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
      <div style="text-align: center; margin-bottom: 20px; font-size: ${getFontSize(settings.fontSize)}; font-weight: 600;">
        ${event.name} • ${event.venue} • ${eventDate}
      </div>

      <!-- Line 2: Table Title -->
      <div style="text-align: center; margin-bottom: 20px; font-size: ${getTitleSize(settings.fontSize)}; font-weight: bold;">
        ${settings.title || `TABLE ${table.table_no}`}
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
            border: 4px solid #333;
            background: #f5f5f5;
            ${settings.tableShape === 'round' ? 'border-radius: 50%;' : 'border-radius: 8px;'}
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${getTitleSize(settings.fontSize)};
            font-weight: bold;
            color: #555;
          ">
            ${table.table_no}
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
              border: 4px solid #000;
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

            <!-- Guest Name - Outside circle -->
            ${seat.guest ? `
              <div style="
                position: absolute;
                left: ${seat.nameX}px;
                top: ${seat.nameY - 15}px;
                transform: translateX(-50%);
                text-align: center;
                font-size: ${getFontSize(settings.fontSize)};
                font-weight: 600;
                background: rgba(255,255,255,0.9);
                padding: 2px 6px;
                border-radius: 4px;
                white-space: nowrap;
              ">
                ${seat.guest.first_name}
              </div>
              <div style="
                position: absolute;
                left: ${seat.nameX}px;
                top: ${seat.nameY + 5}px;
                transform: translateX(-50%);
                text-align: center;
                font-size: ${getFontSize(settings.fontSize)};
                font-weight: 600;
                background: rgba(255,255,255,0.9);
                padding: 2px 6px;
                border-radius: 4px;
                white-space: nowrap;
              ">
                ${seat.guest.last_name}
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