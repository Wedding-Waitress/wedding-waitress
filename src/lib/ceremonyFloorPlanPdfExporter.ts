/**
 * ⚠️ WARNING: PRODUCTION LOCKED - DO NOT MODIFY ⚠️
 * 
 * This file is part of the Ceremony Floor Plan feature which has been
 * finalized and locked for production use as of 2025-12-21.
 * 
 * ANY MODIFICATIONS require explicit written approval from the project owner.
 * 
 * See CEREMONY_FLOOR_PLAN_SPECS.md for complete technical specifications.
 */

import jsPDF from 'jspdf';
import { CeremonyFloorPlan, getDefaultBridalRole } from '@/hooks/useCeremonyFloorPlan';
import { format } from 'date-fns';


// Define the event type inline to avoid circular dependency with hooks
interface EventData {
  name: string;
  date: string | null;
  venue: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
}

// Constants matching Individual Table Charts
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 20;

const PRIMARY_COLOR = '#7248e6';

const formatDateWithOrdinal = (dateString: string | null | undefined): string => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDate();
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName} ${ordinal(day)}, ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
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

  // === HEADER (matching Running Sheet style) ===
  
  // Event Name - Purple, Bold, ~22px = ~16.5pt
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16.5);
  pdf.setTextColor(109, 40, 217); // #6d28d9
  pdf.text(event.name, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 7;

  // "Floor Plan – Ceremony" - ~16px = ~12pt
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(34, 34, 34);
  pdf.text('Floor Plan – Ceremony', PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 7;

  // Ceremony detail line
  pdf.setFontSize(9);
  pdf.setTextColor(85, 85, 85);
  const ceremonyDateStr = formatDateWithOrdinal(event.ceremony_date || event.date);
  const ceremonyVenue = event.ceremony_venue || event.venue || 'Venue TBD';
  const ceremonyTime = `${formatTimeDisplay(event.ceremony_start_time)} – ${formatTimeDisplay(event.ceremony_finish_time)}`;
  pdf.text(`Ceremony: ${ceremonyDateStr} | ${ceremonyVenue} | ${ceremonyTime}`, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 5;

  // Reception detail line
  const receptionDateStr = formatDateWithOrdinal(event.date);
  const receptionVenue = event.venue || 'Venue TBD';
  const receptionTime = `${formatTimeDisplay(event.start_time)} – ${formatTimeDisplay(event.finish_time)}`;
  pdf.text(`Reception: ${receptionDateStr} | ${receptionVenue} | ${receptionTime}`, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 6;

  // Total Attending Ceremony line
  const leftBridalCount = floorPlan.bridal_party_count_left || 0;
  const rightBridalCount = floorPlan.bridal_party_count_right || 0;
  const familySeatsTotal = floorPlan.total_rows * floorPlan.chairs_per_row * 2;
  const totalAttendingCeremony = 3 + leftBridalCount + rightBridalCount + familySeatsTotal;
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    `Total Attending Ceremony: ${totalAttendingCeremony} (This includes Bride & Groom + Celebrant + Bridal Party + all Family & Friends)`,
    PAGE_WIDTH / 2,
    yPos,
    { align: 'center' }
  );
  yPos += 4;

  // Purple divider line
  pdf.setDrawColor(109, 40, 217);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_LEFT, yPos, PAGE_WIDTH - MARGIN_RIGHT, yPos);
  yPos += 8;

  // === FLOOR PLAN VISUAL ===
  
  // Calculate dimensions - larger rectangles for readability
  const seatWidth = 14;
  const seatHeight = 10.5;
  const seatGap = 1.5;
  const rowGap = 2;
  
  const sideWidth = (floorPlan.chairs_per_row * seatWidth) + ((floorPlan.chairs_per_row - 1) * seatGap);
  const aisleWidth = 18;
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
  
  const bridalBoxWidth = 14;
  const bridalBoxHeight = 10.5;
  const bridalGap = 1;
  const bridalRowGap = 2;
  const roleHeight = 3;
  const celebrantRadius = 6;
  const coupleCircleRadius = 7;
  const celebrantX = PAGE_WIDTH / 2;
  
  // Max 6 per row
  const MAX_PER_ROW = 6;
  const leftFirstRowCount = Math.min(leftCount, MAX_PER_ROW);
  const leftSecondRowCount = Math.max(0, leftCount - MAX_PER_ROW);
  const rightFirstRowCount = Math.min(rightCount, MAX_PER_ROW);
  const rightSecondRowCount = Math.max(0, rightCount - MAX_PER_ROW);
  
  // Calculate if we have a second row (need extra vertical space)
  const hasSecondRow = leftSecondRowCount > 0 || rightSecondRowCount > 0;
  
  // Helper to get role for a bridal party member
  const getBridalRole = (side: 'left' | 'right', index: number): string => {
    const rolesArray = side === 'left' ? floorPlan.bridal_party_roles_left : floorPlan.bridal_party_roles_right;
    const totalCount = side === 'left' ? leftCount : rightCount;
    const savedRole = rolesArray?.[index];
    
    // Get the calculated default role for this position based on arrangement
    const defaultRole = getDefaultBridalRole(side, index, floorPlan.couple_side_arrangement, totalCount);
    
    // Standard roles that should always follow the arrangement
    const standardRoles = ['Best Man', 'Groomsman', 'Maid of Honor', 'Bridesmaid'];
    
    // Only use saved role if it's truly custom (not a standard default)
    if (savedRole && !standardRoles.includes(savedRole)) {
      return savedRole;
    }
    
    return defaultRole;
  };
  
  // Helper to render bridal party boxes for a given row (with role labels)
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
      const role = getBridalRole(side, startIndex + i);
      
      // Draw box
      if (name) {
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(114, 72, 230);
      } else {
        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(180, 180, 180);
      }
      pdf.setLineWidth(0.2);
      pdf.roundedRect(boxX, yPos + rowYOffset, bridalBoxWidth, bridalBoxHeight, 0.5, 0.5, 'FD');
      
      // Draw name
      if (name) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(0, 0, 0);
        const parts = name.split(' ');
        if (parts.length > 1) {
          pdf.text(parts[0], boxX + (bridalBoxWidth / 2), yPos + rowYOffset + 3, { align: 'center' });
          pdf.text(parts.slice(1).join(' ').substring(0, 8), boxX + (bridalBoxWidth / 2), yPos + rowYOffset + 6, { align: 'center' });
        } else {
          pdf.text(name.substring(0, 10), boxX + (bridalBoxWidth / 2), yPos + rowYOffset + 4.5, { align: 'center' });
        }
      }
      
      // Draw role label below the box
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(4.5);
      pdf.setTextColor(0, 0, 0);
      const truncatedRole = role.length > 12 ? role.substring(0, 11) + '.' : role;
      pdf.text(truncatedRole, boxX + (bridalBoxWidth / 2), yPos + rowYOffset + bridalBoxHeight + 2.5, { align: 'center' });
    }
  };
  
  // Labels for bridal party - purple to match side labels
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(114, 72, 230);
  
  // Left bridal party label with count
  if (leftCount > 0) {
    const leftFirstRowWidth = (leftFirstRowCount * bridalBoxWidth) + ((leftFirstRowCount - 1) * bridalGap);
    const leftStartX = celebrantX - celebrantRadius - coupleCircleRadius * 2 - 8 - leftFirstRowWidth;
    pdf.text(`${leftPartyLabel} (${leftCount})`, leftStartX + (leftFirstRowWidth / 2), yPos, { align: 'center' });
  }
  
  // Right bridal party label with count
  if (rightCount > 0) {
    const rightFirstRowWidth = (rightFirstRowCount * bridalBoxWidth) + ((rightFirstRowCount - 1) * bridalGap);
    const rightStartX = celebrantX + celebrantRadius + coupleCircleRadius * 2 + 8;
    pdf.text(`${rightPartyLabel} (${rightCount})`, rightStartX + (rightFirstRowWidth / 2), yPos, { align: 'center' });
  }
  
  // Render first row of bridal party
  const firstRowYOffset = 3;
  renderBridalRow('left', 0, leftFirstRowCount, firstRowYOffset);
  renderBridalRow('right', 0, rightFirstRowCount, firstRowYOffset);
  
  // Render second row if needed
  const secondRowYOffset = firstRowYOffset + bridalBoxHeight + roleHeight + bridalRowGap + 2;
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
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(leftPersonName.substring(0, 10), leftPersonX, coupleCircleY + 1, { align: 'center' });
  
  // Celebrant circle (center)
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.circle(celebrantX, coupleCircleY, celebrantRadius, 'FD');
  pdf.setFontSize(6);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Celebrant', celebrantX, coupleCircleY + 1, { align: 'center' });
  
  // Right person circle (beside celebrant)
  const rightPersonX = celebrantX + celebrantRadius + coupleCircleRadius + 2;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(114, 72, 230);
  pdf.setLineWidth(0.4);
  pdf.circle(rightPersonX, coupleCircleY, coupleCircleRadius, 'FD');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(rightPersonName.substring(0, 10), rightPersonX, coupleCircleY + 1, { align: 'center' });
  
  // Adjust yPos based on whether we have a second row - add extra gap before guest seating
  // Include roleHeight for the role labels below each bridal party box
  if (hasSecondRow) {
    yPos += secondRowYOffset + bridalBoxHeight + roleHeight + 22;
  } else {
    yPos += bridalBoxHeight + roleHeight + 26;
  }


  // Side labels - dark purple
  const leftSideCenter = startX + (sideWidth / 2);
  const rightSideCenter = startX + sideWidth + aisleWidth + (sideWidth / 2);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(114, 72, 230); // Purple
  const familySeatsPerSide = floorPlan.total_rows * floorPlan.chairs_per_row;
  pdf.text(`${floorPlan.left_side_label} (${familySeatsPerSide})`, leftSideCenter, yPos, { align: 'center' });
  pdf.text(`${floorPlan.right_side_label} (${familySeatsPerSide})`, rightSideCenter, yPos, { align: 'center' });
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

    // Row number on right (for Bride's Family)
    if (floorPlan.show_row_numbers) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      const rightRowNumberX = startX + sideWidth + aisleWidth + (floorPlan.chairs_per_row * (seatWidth + seatGap)) + 2;
      pdf.text(String(row), rightRowNumberX, rowY + (seatHeight / 2) + 1, { align: 'left' });
    }

    // Left side seats
    for (let seat = 1; seat <= floorPlan.chairs_per_row; seat++) {
      const seatX = startX + ((seat - 1) * (seatWidth + seatGap));
      const seatName = floorPlan.seat_assignments.find(
        a => a.side === 'left' && a.row === row && a.seat === seat
      )?.name || '';

      // Seat box
      if (seatName) {
        pdf.setFillColor(240, 235, 250); // Light purple bg
        pdf.setDrawColor(114, 72, 230);  // Purple border
      } else if (isAssignedRow) {
        pdf.setFillColor(240, 235, 250); // Light purple bg
        pdf.setDrawColor(196, 181, 253); // Light purple border
      } else {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(220, 220, 220);
      }
      pdf.setLineWidth(0.2);
      pdf.roundedRect(seatX, rowY, seatWidth, seatHeight, 0.5, 0.5, 'FD');

      // Seat content - Two lines for first/surname - BLACK text
      pdf.setFontSize(6);
      if (seatName) {
        pdf.setTextColor(0, 0, 0);
        const parts = seatName.split(' ');
        if (parts.length > 1) {
          pdf.text(parts[0], seatX + (seatWidth / 2), rowY + 4, { align: 'center' });
          const surname = parts.slice(1).join(' ');
          const truncatedSurname = surname.length > 12 ? surname.substring(0, 11) + '.' : surname;
          pdf.text(truncatedSurname, seatX + (seatWidth / 2), rowY + 7.5, { align: 'center' });
        } else {
          pdf.text(seatName, seatX + (seatWidth / 2), rowY + 5.5, { align: 'center' });
        }
      } else if (floorPlan.show_seat_numbers) {
        pdf.setTextColor(150, 150, 150);
        pdf.text(String(seat), seatX + (seatWidth / 2), rowY + 5.5, { align: 'center' });
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
        pdf.setFillColor(240, 235, 250); // Light purple bg
        pdf.setDrawColor(114, 72, 230);  // Purple border
      } else if (isAssignedRow) {
        pdf.setFillColor(240, 235, 250); // Light purple bg
        pdf.setDrawColor(196, 181, 253); // Light purple border
      } else {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(220, 220, 220);
      }
      pdf.setLineWidth(0.2);
      pdf.roundedRect(seatX, rowY, seatWidth, seatHeight, 0.5, 0.5, 'FD');

      // Seat content - Two lines for first/surname - BLACK text
      pdf.setFontSize(6);
      if (seatName) {
        pdf.setTextColor(0, 0, 0);
        const parts = seatName.split(' ');
        if (parts.length > 1) {
          pdf.text(parts[0], seatX + (seatWidth / 2), rowY + 4, { align: 'center' });
          const surname = parts.slice(1).join(' ');
          const truncatedSurname = surname.length > 12 ? surname.substring(0, 11) + '.' : surname;
          pdf.text(truncatedSurname, seatX + (seatWidth / 2), rowY + 7.5, { align: 'center' });
        } else {
          pdf.text(seatName, seatX + (seatWidth / 2), rowY + 5.5, { align: 'center' });
        }
      } else if (floorPlan.show_seat_numbers) {
        pdf.setTextColor(150, 150, 150);
        pdf.text(String(seat), seatX + (seatWidth / 2), rowY + 5.5, { align: 'center' });
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

  // Add "General Seating" at the very bottom of each side (after last row)
  if (floorPlan.assigned_rows < floorPlan.total_rows) {
    const bottomY = yPos + (floorPlan.total_rows * (seatHeight + rowGap)) + 1;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(150, 150, 150);
    pdf.text('General Seating', leftSideCenter, bottomY, { align: 'center' });
    pdf.text('General Seating', rightSideCenter, bottomY, { align: 'center' });
  }

  const walkwayText = "Bride's Walkway - Aisle";
  const walkwayTextY = aisleStartY + 20;
  const trueCenterX = (PAGE_WIDTH / 2) + 20;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(114, 72, 230);
  
  // Draw rotated text at the TRUE center of the page, facing Groom's side
  pdf.text(walkwayText, trueCenterX, walkwayTextY, { align: 'center', angle: -90 });

  // === FOOTER ===
  // Page info on left, Generated date on right
  const footerY = PAGE_HEIGHT - 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Page 1 of 1', MARGIN_LEFT, footerY);
  
  const generatedDate = format(new Date(), 'dd/MM/yyyy');
  const generatedTime = format(new Date(), 'h:mm a');
  pdf.text(`Generated: ${generatedDate} ${generatedTime}`, PAGE_WIDTH - MARGIN_RIGHT, footerY, { align: 'right' });

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
    const logoY = PAGE_HEIGHT - MARGIN_BOTTOM - 2;

    pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Failed to load logo for PDF:', error);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Wedding Waitress', PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN_BOTTOM + 6, { align: 'center' });
  }

  // Generate filename using event date (not generated date)
  // Preserve readable characters like & and '
  const eventName = event.name.replace(/[<>:"/\\|?*]/g, '');
  const eventDateForFilename = event.date 
    ? format(new Date(event.date), 'dd-MM-yyyy') 
    : format(new Date(), 'dd-MM-yyyy');
  const fileName = `${eventName}-Ceremony-Floor Plan-${eventDateForFilename}.pdf`;

  pdf.save(fileName);
};
