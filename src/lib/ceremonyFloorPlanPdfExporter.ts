import jsPDF from 'jspdf';
import { CeremonyFloorPlan } from '@/hooks/useCeremonyFloorPlan';
import { format } from 'date-fns';

// Define the event type inline to avoid circular dependency with hooks
interface EventData {
  name: string;
  date: string | null;
  venue: string | null;
  ceremony_venue?: string | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
}

// Constants matching Individual Table Charts
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 20;

const PRIMARY_COLOR = '#7248e6';

// Helper to format time
const formatTime = (time: string | null | undefined): string => {
  if (!time) return '';
  const [hours, mins] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${mins} ${ampm}`;
};

export const generateCeremonyFloorPlanPDF = async (
  floorPlan: CeremonyFloorPlan,
  event: EventData
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPos = MARGIN_TOP;
  const contentWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  // === HEADER ===
  // Event Name - Purple, Bold, 14pt, centered
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(114, 72, 230); // Primary purple
  pdf.text(event.name, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 8;

  // "Ceremony Seating Arrangement – [Full Date with Weekday] – [Start Time] to [Finish Time]"
  pdf.setFontSize(9); // Slightly smaller to fit times
  pdf.setTextColor(0, 0, 0);
  const eventDate = event.date ? format(new Date(event.date), 'EEEE, do MMMM yyyy') : 'Date TBD';
  
  let dateTimeString = `Ceremony Seating Arrangement – ${eventDate}`;
  if (event.ceremony_start_time && event.ceremony_finish_time) {
    dateTimeString += ` – ${formatTime(event.ceremony_start_time)} to ${formatTime(event.ceremony_finish_time)}`;
  }
  pdf.text(dateTimeString, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 6;

  // "[Venue] – Generated on: DD/MM/YY Time: HH:MM"
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const venue = event.ceremony_venue || event.venue || 'Venue TBD';
  const generatedDate = format(new Date(), 'dd/MM/yy');
  const generatedTime = format(new Date(), 'h:mm a');
  pdf.text(`${venue} – Generated on: ${generatedDate} Time: ${generatedTime}`, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 6;

  // Separator line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_LEFT, yPos, PAGE_WIDTH - MARGIN_RIGHT, yPos);
  yPos += 10;

  // === FLOOR PLAN VISUAL ===
  
  // Calculate dimensions - wider rectangles
  const seatWidth = 12;
  const seatHeight = 9;
  const seatGap = 1.5;
  const rowGap = 2;
  
  const sideWidth = (floorPlan.chairs_per_row * seatWidth) + ((floorPlan.chairs_per_row - 1) * seatGap);
  const aisleWidth = 20;
  const totalWidth = (sideWidth * 2) + aisleWidth;
  const startX = (PAGE_WIDTH - totalWidth) / 2;

  // Determine labels based on couple arrangement
  const isGroomLeft = floorPlan.couple_side_arrangement !== 'bride_left';
  const leftPartyLabel = isGroomLeft ? 'Groomsmen' : 'Bridesmaids';
  const rightPartyLabel = isGroomLeft ? 'Bridesmaids' : 'Groomsmen';

  // Get couple names
  const leftPersonName = (floorPlan as any).person_left_name || (isGroomLeft ? 'Groom' : 'Bride');
  const rightPersonName = (floorPlan as any).person_right_name || (isGroomLeft ? 'Bride' : 'Groom');

  // === BRIDAL PARTY ===
  const leftCount = floorPlan.bridal_party_count_left || 0;
  const rightCount = floorPlan.bridal_party_count_right || 0;
  
  const bridalBoxWidth = 12;
  const bridalBoxHeight = 9;
  const bridalGap = 1;
  const bridalRowGap = 2;
  const celebrantRadius = 4.5;
  const coupleCircleRadius = 5.5;
  const celebrantX = PAGE_WIDTH / 2;
  
  // Max 6 per row
  const MAX_PER_ROW = 6;
  const leftFirstRowCount = Math.min(leftCount, MAX_PER_ROW);
  const leftSecondRowCount = Math.max(0, leftCount - MAX_PER_ROW);
  const rightFirstRowCount = Math.min(rightCount, MAX_PER_ROW);
  const rightSecondRowCount = Math.max(0, rightCount - MAX_PER_ROW);
  
  // Calculate if we have a second row (need extra vertical space)
  const hasSecondRow = leftSecondRowCount > 0 || rightSecondRowCount > 0;
  
  // Helper to render bridal party boxes for a given row
  const renderBridalRow = (side: 'left' | 'right', startIndex: number, count: number, rowYOffset: number) => {
    if (count === 0) return;
    
    const totalWidth = (count * bridalBoxWidth) + ((count - 1) * bridalGap);
    let startX: number;
    
    if (side === 'left') {
      // Position left side to the left of the couple
      startX = celebrantX - celebrantRadius - coupleCircleRadius * 2 - 8 - totalWidth;
    } else {
      // Position right side to the right of the couple
      startX = celebrantX + celebrantRadius + coupleCircleRadius * 2 + 8;
    }
    
    for (let i = 0; i < count; i++) {
      const boxX = startX + (i * (bridalBoxWidth + bridalGap));
      const name = side === 'left' 
        ? floorPlan.bridal_party_left?.[startIndex + i] || ''
        : floorPlan.bridal_party_right?.[startIndex + i] || '';
      
      if (name) {
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(114, 72, 230);
      } else {
        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(180, 180, 180);
      }
      pdf.setLineWidth(0.2);
      pdf.roundedRect(boxX, yPos + rowYOffset, bridalBoxWidth, bridalBoxHeight, 0.5, 0.5, 'FD');
      
      if (name) {
        pdf.setFontSize(5.5);
        pdf.setTextColor(0, 0, 0);
        const parts = name.split(' ');
        if (parts.length > 1) {
          pdf.text(parts[0], boxX + (bridalBoxWidth / 2), yPos + rowYOffset + 2.5, { align: 'center' });
          pdf.text(parts.slice(1).join(' ').substring(0, 6), boxX + (bridalBoxWidth / 2), yPos + rowYOffset + 5, { align: 'center' });
        } else {
          pdf.text(name.substring(0, 8), boxX + (bridalBoxWidth / 2), yPos + rowYOffset + 3.5, { align: 'center' });
        }
      }
    }
  };
  
  // Labels for bridal party - purple to match side labels
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(114, 72, 230);
  
  // Left bridal party label
  if (leftCount > 0) {
    const leftFirstRowWidth = (leftFirstRowCount * bridalBoxWidth) + ((leftFirstRowCount - 1) * bridalGap);
    const leftStartX = celebrantX - celebrantRadius - coupleCircleRadius * 2 - 8 - leftFirstRowWidth;
    pdf.text(leftPartyLabel, leftStartX + (leftFirstRowWidth / 2), yPos, { align: 'center' });
  }
  
  // Right bridal party label
  if (rightCount > 0) {
    const rightFirstRowWidth = (rightFirstRowCount * bridalBoxWidth) + ((rightFirstRowCount - 1) * bridalGap);
    const rightStartX = celebrantX + celebrantRadius + coupleCircleRadius * 2 + 8;
    pdf.text(rightPartyLabel, rightStartX + (rightFirstRowWidth / 2), yPos, { align: 'center' });
  }
  
  // Render first row of bridal party
  const firstRowYOffset = 3;
  renderBridalRow('left', 0, leftFirstRowCount, firstRowYOffset);
  renderBridalRow('right', 0, rightFirstRowCount, firstRowYOffset);
  
  // Render second row if needed
  const secondRowYOffset = firstRowYOffset + bridalBoxHeight + bridalRowGap;
  if (leftSecondRowCount > 0) {
    renderBridalRow('left', MAX_PER_ROW, leftSecondRowCount, secondRowYOffset);
  }
  if (rightSecondRowCount > 0) {
    renderBridalRow('right', MAX_PER_ROW, rightSecondRowCount, secondRowYOffset);
  }
  
  // Calculate vertical center for couple circles (between the two rows if second row exists)
  const coupleCircleY = hasSecondRow 
    ? yPos + firstRowYOffset + bridalBoxHeight / 2 + bridalRowGap / 2
    : yPos + 7;
  
  // Left person circle (beside celebrant)
  const leftPersonX = celebrantX - celebrantRadius - coupleCircleRadius - 2;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(114, 72, 230);
  pdf.setLineWidth(0.4);
  pdf.circle(leftPersonX, coupleCircleY, coupleCircleRadius, 'FD');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.text(leftPersonName.substring(0, 8), leftPersonX, coupleCircleY + 0.5, { align: 'center' });
  
  // Celebrant circle (center)
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.circle(celebrantX, coupleCircleY, celebrantRadius, 'FD');
  pdf.setFontSize(4);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Celebrant', celebrantX, coupleCircleY + 0.5, { align: 'center' });
  
  // Right person circle (beside celebrant)
  const rightPersonX = celebrantX + celebrantRadius + coupleCircleRadius + 2;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(114, 72, 230);
  pdf.setLineWidth(0.4);
  pdf.circle(rightPersonX, coupleCircleY, coupleCircleRadius, 'FD');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.text(rightPersonName.substring(0, 8), rightPersonX, coupleCircleY + 0.5, { align: 'center' });
  
  // Adjust yPos based on whether we have a second row - add extra gap before guest seating
  if (hasSecondRow) {
    yPos += secondRowYOffset + bridalBoxHeight + 20;
  } else {
    yPos += bridalBoxHeight + 24;
  }


  // Side labels - dark purple
  const leftSideCenter = startX + (sideWidth / 2);
  const rightSideCenter = startX + sideWidth + aisleWidth + (sideWidth / 2);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(114, 72, 230); // Purple
  pdf.text(floorPlan.left_side_label, leftSideCenter, yPos, { align: 'center' });
  pdf.text(floorPlan.right_side_label, rightSideCenter, yPos, { align: 'center' });
  yPos += 6;

  // Calculate aisle line coordinates
  const aisleX = PAGE_WIDTH / 2;
  const aisleStartY = yPos;
  const aisleEndY = yPos + (floorPlan.total_rows * (seatHeight + rowGap)) - rowGap;

  // Draw seats - SQUARE with two-line names
  for (let row = 1; row <= floorPlan.total_rows; row++) {
    const isAssignedRow = row <= floorPlan.assigned_rows;
    const rowY = yPos + ((row - 1) * (seatHeight + rowGap));
    
    // Row number on left
    if (floorPlan.show_row_numbers) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text(String(row), startX - 4, rowY + (seatHeight / 2) + 1, { align: 'right' });
    }

    // Left side seats
    for (let seat = 1; seat <= floorPlan.chairs_per_row; seat++) {
      const seatX = startX + ((seat - 1) * (seatWidth + seatGap));
      const seatName = floorPlan.seat_assignments.find(
        a => a.side === 'left' && a.row === row && a.seat === seat
      )?.name || '';

      // Seat box
      if (seatName) {
        pdf.setFillColor(255, 255, 255); // White background
        pdf.setDrawColor(114, 72, 230);
      } else if (isAssignedRow) {
        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(180, 180, 180);
      } else {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(220, 220, 220);
      }
      pdf.setLineWidth(0.2);
      pdf.roundedRect(seatX, rowY, seatWidth, seatHeight, 0.5, 0.5, 'FD');

      // Seat content - Two lines for first/surname - BLACK text
      pdf.setFontSize(5.5);
      if (seatName) {
        pdf.setTextColor(0, 0, 0); // Black
        const parts = seatName.split(' ');
        if (parts.length > 1) {
          pdf.text(parts[0], seatX + (seatWidth / 2), rowY + 3.5, { align: 'center' });
          const surname = parts.slice(1).join(' ');
          const truncatedSurname = surname.length > 10 ? surname.substring(0, 9) + '.' : surname;
          pdf.text(truncatedSurname, seatX + (seatWidth / 2), rowY + 6.5, { align: 'center' });
        } else {
          pdf.text(seatName, seatX + (seatWidth / 2), rowY + 5, { align: 'center' });
        }
      } else if (floorPlan.show_seat_numbers) {
        pdf.setTextColor(150, 150, 150);
        pdf.text(String(seat), seatX + (seatWidth / 2), rowY + 5, { align: 'center' });
      }
    }

    // Right side seats
    for (let seat = 1; seat <= floorPlan.chairs_per_row; seat++) {
      const seatX = startX + sideWidth + aisleWidth + ((seat - 1) * (seatWidth + seatGap));
      const seatName = floorPlan.seat_assignments.find(
        a => a.side === 'right' && a.row === row && a.seat === seat
      )?.name || '';

      // Seat box
      if (seatName) {
        pdf.setFillColor(255, 255, 255); // White background
        pdf.setDrawColor(114, 72, 230);
      } else if (isAssignedRow) {
        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(180, 180, 180);
      } else {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(220, 220, 220);
      }
      pdf.setLineWidth(0.2);
      pdf.roundedRect(seatX, rowY, seatWidth, seatHeight, 0.5, 0.5, 'FD');

      // Seat content - Two lines for first/surname - BLACK text
      pdf.setFontSize(5.5);
      if (seatName) {
        pdf.setTextColor(0, 0, 0); // Black
        const parts = seatName.split(' ');
        if (parts.length > 1) {
          pdf.text(parts[0], seatX + (seatWidth / 2), rowY + 3.5, { align: 'center' });
          const surname = parts.slice(1).join(' ');
          const truncatedSurname = surname.length > 10 ? surname.substring(0, 9) + '.' : surname;
          pdf.text(truncatedSurname, seatX + (seatWidth / 2), rowY + 6.5, { align: 'center' });
        } else {
          pdf.text(seatName, seatX + (seatWidth / 2), rowY + 5, { align: 'center' });
        }
      } else if (floorPlan.show_seat_numbers) {
        pdf.setTextColor(150, 150, 150);
        pdf.text(String(seat), seatX + (seatWidth / 2), rowY + 5, { align: 'center' });
      }
    }

    // Draw assigned/general separator after assigned rows
    if (row === floorPlan.assigned_rows && row < floorPlan.total_rows) {
      const sepY = rowY + seatHeight + (rowGap / 2);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.setLineDashPattern([2, 1], 0);
      pdf.line(startX, sepY, startX + sideWidth, sepY);
      pdf.line(startX + sideWidth + aisleWidth, sepY, startX + totalWidth, sepY);
      pdf.setLineDashPattern([], 0);
      
      // "General Seating" label
      pdf.setFontSize(6);
      pdf.setTextColor(150, 150, 150);
      pdf.text('General Seating', leftSideCenter, sepY + 2, { align: 'center' });
      pdf.text('General Seating', rightSideCenter, sepY + 2, { align: 'center' });
    }

  }

  // Draw "Bride's Walkway - Aisle" text in the walkway area above all seats
  const walkwayText = "Bride's Walkway - Aisle";
  const walkwayTextY = aisleStartY - 5;
  const trueCenterX = (PAGE_WIDTH / 2) + 20;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(114, 72, 230);
  
  // Draw rotated text at the TRUE center of the page, facing Groom's side
  pdf.text(walkwayText, trueCenterX, walkwayTextY, { align: 'center', angle: -90 });

  // === FOOTER ===
  // Wedding Waitress logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => reject(new Error('Failed to load logo'));
      logoImg.src = '/wedding-waitress-new-logo.png';
    });

    const logoHeight = 12;
    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
    const logoX = (PAGE_WIDTH - logoWidth) / 2;
    const logoY = PAGE_HEIGHT - MARGIN_BOTTOM;

    pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Failed to load logo for PDF:', error);
    // Fallback: text footer
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Wedding Waitress', PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN_BOTTOM + 6, { align: 'center' });
  }

  // Generate filename and save directly (no permission popup)
  const eventName = event.name
    .split(/[^a-zA-Z0-9]+/)
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');

  const date = format(new Date(), 'dd-MM-yyyy');
  const fileName = `${eventName}-Ceremony-Floor-Plan-${date}.pdf`;
  
  pdf.save(fileName);
};
