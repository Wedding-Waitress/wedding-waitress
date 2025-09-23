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

  // Arrange seats around table
  const arrangeSeats = () => {
    const seatCount = table.limit_seats;
    const seats = [];
    
    for (let i = 1; i <= seatCount; i++) {
      const guest = sortedGuests.find(g => g.seat_no === i);
      const angle = ((i - 1) / seatCount) * 2 * Math.PI - Math.PI / 2;
      
      const radius = settings.tableShape === 'round' ? 120 : 110;
      const centerX = 400;
      const centerY = 300;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      seats.push({
        number: i,
        guest,
        x,
        y,
        angle
      });
    }
    
    return seats;
  };

  const seats = arrangeSeats();
  const eventDate = event?.date ? format(new Date(event.date), 'PPP') : '';

  return `
    <div style="width: 794px; height: 1123px; background: white; font-family: Arial, sans-serif; padding: 40px; box-sizing: border-box; display: flex; flex-direction: column;">
      <!-- Line 1: Event Info -->
      <div style="text-align: center; margin-bottom: 20px; font-size: ${getFontSize(settings.fontSize)}; font-weight: 600;">
        ${event.name} • ${event.venue} • ${eventDate}
      </div>

      <!-- Line 2: Table Title -->
      <div style="text-align: center; margin-bottom: 40px; font-size: ${getTitleSize(settings.fontSize)}; font-weight: bold;">
        ${settings.title || `TABLE ${table.table_no}`}
      </div>

      <!-- Line 3: Table Visualization -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; margin-bottom: 40px;">
        <div style="position: relative; width: 500px; height: 400px;">
          <!-- Table -->
          <div style="
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 160px;
            height: 160px;
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
              width: 36px;
              height: 36px;
              border: 2px solid #333;
              border-radius: 50%;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              font-size: 12px;
            ">
              ${settings.showSeatNumbers ? seat.number : ''}
            </div>

            <!-- Guest Name -->
            ${settings.includeNames && seat.guest ? `
              <div style="
                position: absolute;
                left: ${seat.x}px;
                top: ${seat.y + (seat.y < 300 ? -25 : 25)}px;
                transform: translateX(-50%);
                font-size: ${getFontSize(settings.fontSize)};
                font-weight: 500;
                text-align: center;
                white-space: nowrap;
              ">
                ${seat.guest.first_name} ${seat.guest.last_name}
              </div>
            ` : ''}
          `).join('')}
        </div>
      </div>

      <!-- Line 4 & 5: Guest List -->
      ${settings.includeGuestList ? `
        <div style="margin-bottom: 40px;">
          <h3 style="font-size: ${getFontSize(settings.fontSize)}; font-weight: bold; margin-bottom: 16px;">
            Guest's on this Table & Dietary
          </h3>
          <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
            ${sortedGuests.map((guest, index) => `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: ${getFontSize(settings.fontSize)};">
                <span>${index + 1}. ${guest.first_name} ${guest.last_name}</span>
                ${settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? `
                  <span style="background: #f0f0f0; border: 1px solid #ccc; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                    ${guest.dietary}
                  </span>
                ` : ''}
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