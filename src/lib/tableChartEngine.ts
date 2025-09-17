import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChartSettings } from '@/components/Dashboard/TableChart/TableSeatingChartPage';
import { TableWithGuestCount } from '@/hooks/useTables';
import { Guest } from '@/hooks/useGuests';
import { generateTableLayout } from './tableLayoutAlgorithms';

/**
 * Paper size configurations in millimeters
 */
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 }
};

/**
 * Generate PDF of the table seating chart
 */
export const generateTableChartPDF = async (
  settings: ChartSettings,
  tables: TableWithGuestCount[],
  guests: Guest[],
  event: any
): Promise<Blob> => {
  const paperSize = PAPER_SIZES[settings.paperSize];
  // Force portrait orientation for all sizes
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperSize.width, paperSize.height]
  });

  // Generate the chart content
  const svgContent = generateChartSVG(settings, tables, guests, event);
  
  // Create a temporary container for the SVG
  const container = document.createElement('div');
  container.innerHTML = svgContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = `${paperSize.width * 3.78}px`; // Convert mm to px (96 DPI)
  container.style.height = `${paperSize.height * 3.78}px`;
  document.body.appendChild(container);

  try {
    // Convert SVG to canvas
    const canvas = await html2canvas(container, {
      width: paperSize.width * 3.78,
      height: paperSize.height * 3.78,
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    // Add the canvas to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, paperSize.width, paperSize.height);

    // Clean up
    document.body.removeChild(container);

    return new Blob([pdf.output('blob')], { type: 'application/pdf' });
  } catch (error) {
    // Clean up on error
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw error;
  }
};

/**
 * Generate image of the table seating chart
 */
export const generateTableChartImage = async (
  settings: ChartSettings,
  tables: TableWithGuestCount[],
  guests: Guest[],
  event: any,
  format: 'png' | 'jpg'
): Promise<Blob> => {
  const paperSize = PAPER_SIZES[settings.paperSize];
  const svgContent = generateChartSVG(settings, tables, guests, event);
  
  // Create a temporary container for the SVG
  const container = document.createElement('div');
  container.innerHTML = svgContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = `${paperSize.width * 3.78}px`;
  container.style.height = `${paperSize.height * 3.78}px`;
  document.body.appendChild(container);

  try {
    // Convert to canvas
    const canvas = await html2canvas(container, {
      width: paperSize.width * 3.78,
      height: paperSize.height * 3.78,
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    // Clean up
    document.body.removeChild(container);

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    });
  } catch (error) {
    // Clean up on error
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw error;
  }
};

/**
 * Generate SVG content for the chart
 */
export const generateChartSVG = (
  settings: ChartSettings,
  tables: TableWithGuestCount[],
  guests: Guest[],
  event: any
): string => {
  const paperSize = PAPER_SIZES[settings.paperSize];
  const width = paperSize.width * 3.78; // Convert mm to px
  const height = paperSize.height * 3.78;
  const padding = 40;

  // Generate table positions using print-ready grid layout
  const tablePositions = generateTableLayout(tables, 'grid').map(pos => ({
    ...pos,
    guests: guests.filter(guest => guest.table_id === pos.table.id)
  }));

    // Font sizes based on setting - increased guest name sizes
    const fontSize = {
      small: { title: 18, subtitle: 14, table: 12, guest: 12, legend: 8 },
      medium: { title: 24, subtitle: 18, table: 16, guest: 14, legend: 10 },
      large: { title: 32, subtitle: 24, table: 20, guest: 16, legend: 12 }
    }[settings.fontSize];

  // Color schemes
  const getGuestColor = (guest: Guest, table: TableWithGuestCount) => {
    switch (settings.colorCoding) {
      case 'rsvp':
        switch (guest.rsvp) {
          case 'Confirmed': return { bg: '#dcfce7', border: '#16a34a', text: '#15803d' };
          case 'Declined': return { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' };
          case 'Pending': return { bg: '#fefce8', border: '#ca8a04', text: '#a16207' };
          default: return { bg: '#f1f5f9', border: '#64748b', text: '#475569' };
        }
      case 'dietary':
        const hasDietary = guest.dietary && guest.dietary !== 'NA';
        return hasDietary 
          ? { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' }
          : { bg: '#f1f5f9', border: '#64748b', text: '#475569' };
      case 'capacity':
        const isAtCapacity = table.guest_count >= table.limit_seats;
        const isOverCapacity = table.guest_count > table.limit_seats;
        if (isOverCapacity) return { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' };
        if (isAtCapacity) return { bg: '#fefce8', border: '#ca8a04', text: '#a16207' };
        return { bg: '#dcfce7', border: '#16a34a', text: '#15803d' };
      default:
        return { bg: '#f8fafc', border: '#e2e8f0', text: '#334155' };
    }
  };

  let svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Title -->
      ${settings.title ? `
        <text x="${width / 2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" 
              font-size="${fontSize.title}" font-weight="bold" fill="#1f2937">
          ${settings.title}
        </text>
      ` : ''}
      
      <!-- Subtitle -->
      ${settings.subtitle ? `
        <text x="${width / 2}" y="${settings.title ? '70' : '40'}" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="${fontSize.subtitle}" fill="#6b7280">
          ${settings.subtitle}
        </text>
      ` : ''}
      
      <!-- Tables -->
  `;

  const chartStartY = settings.title && settings.subtitle ? 90 : settings.title || settings.subtitle ? 60 : 20;
  const availableHeight = height - chartStartY - 100; // Leave space for legend

  tablePositions.forEach((tablePos, index) => {
    const { table, guests: tableGuests } = tablePos;
    const scaledX = padding + (tablePos.x * (width - 2 * padding));
    const scaledY = chartStartY + (tablePos.y * availableHeight);
    const scaledWidth = tablePos.width * (width - 2 * padding);
    const scaledHeight = tablePos.height * availableHeight;

    const isRound = settings.tableShape === 'round' || 
                   (settings.tableShape === 'mixed' && index % 2 === 0);

    // Table Shape with white background
    if (isRound) {
      svgContent += `
        <ellipse cx="${scaledX + scaledWidth / 2}" cy="${scaledY + scaledHeight / 2}" 
                 rx="${scaledWidth / 2}" ry="${scaledHeight / 2}" 
                 fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      `;
    } else {
      svgContent += `
        <rect x="${scaledX}" y="${scaledY}" width="${scaledWidth}" height="${scaledHeight}" 
              fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="8"/>
      `;
    }

    // Table number and capacity centered at top
    svgContent += `
      <text x="${scaledX + scaledWidth / 2}" y="${scaledY + 25}" 
            text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="${fontSize.table}" fill="#1f2937">
        <tspan font-weight="bold">${settings.showTableNumbers ? `Table ${table.table_no || table.name}` : 'Table'}</tspan>
        <tspan font-weight="normal"> - ${table.guest_count}/${table.limit_seats}</tspan>
      </text>
    `;


    // Guest Names - show all up to 12
    if (settings.includeNames && tableGuests.length > 0) {
      tableGuests.slice(0, 12).forEach((guest, guestIndex) => {
        const colors = getGuestColor(guest, table);
        const guestY = scaledY + 45 + (guestIndex * (fontSize.guest + 2));
        
        svgContent += `
          <text x="${scaledX + scaledWidth / 2}" y="${guestY}" 
                text-anchor="middle" font-family="Arial, sans-serif" 
                font-size="${fontSize.guest}" fill="${colors.text}">
            ${`${guest.first_name} ${guest.last_name || ''}`.trim()}
          </text>
        `;
      });
    }

    // Color coding indicator
    if (settings.colorCoding !== 'none' && tableGuests.length > 0) {
      const colors = getGuestColor(tableGuests[0], table);
      svgContent += `
        <rect x="${scaledX + scaledWidth - 15}" y="${scaledY + 8}" 
              width="12" height="12" fill="${colors.bg}" 
              stroke="${colors.border}" stroke-width="1" rx="2"/>
      `;
    }
  });

  // Wedding Waitress Logo at bottom - doubled in size
  svgContent += `
    <image href="/wedding-waitress-logo.png" x="${width / 2 - 80}" y="${height - 90}" width="160" height="80" preserveAspectRatio="xMidYMid meet" />
  `;

  svgContent += '</svg>';
  return svgContent;
};