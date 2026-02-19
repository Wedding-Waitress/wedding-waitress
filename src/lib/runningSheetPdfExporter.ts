import jsPDF from 'jspdf';
import { RunningSheetItem } from '@/types/runningSheet';

interface Event {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  ceremony_date?: string | null;
  ceremony_venue?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
  ceremony_start_time?: string | null;
  ceremony_finish_time?: string | null;
}

const PURPLE = { r: 109, g: 40, b: 217 };

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

const formatGeneratedTimestamp = (): string => {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch('/jpeg-2.jpg');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const getEventText = (item: RunningSheetItem): string => {
  if (typeof item.description_rich === 'object' && item.description_rich?.text !== undefined) return item.description_rich.text;
  if (typeof item.description_rich === 'string') return item.description_rich;
  return '';
};

const truncateText = (pdf: jsPDF, text: string, maxWidth: number): string => {
  if (!text) return '';
  let truncated = text;
  while (pdf.getTextWidth(truncated) > maxWidth && truncated.length > 3) {
    truncated = truncated.slice(0, -4) + '...';
  }
  return truncated;
};

const drawRunningSheetTable = (
  pdf: jsPDF,
  items: RunningSheetItem[],
  startY: number,
  pageWidth: number,
  margin: number,
  contentWidth: number,
  sectionLabel: string,
  sectionNotes: string | null
): number => {
  const rowHeight = 7;
  const headerHeight = 8;
  let yPos = startY;

  // Section title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.text(sectionLabel, margin, yPos);
  yPos += 5;

  if (sectionNotes) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const noteLines = pdf.splitTextToSize(`Notes: ${sectionNotes}`, contentWidth);
    pdf.text(noteLines, margin, yPos);
    yPos += noteLines.length * 4 + 2;
  }

  // Column widths: Time 20%, Event 50%, Who 30%
  const colWidths = [0.2, 0.5, 0.3];
  const colHeaders = ['TIME', 'EVENT', 'WHO'];

  // Header row
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPos, contentWidth, headerHeight, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 80);

  let xPos = margin + 2;
  colHeaders.forEach((header, idx) => {
    pdf.text(header, xPos, yPos + 5);
    xPos += contentWidth * colWidths[idx];
  });
  yPos += headerHeight;

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPos, margin + contentWidth, yPos);

  // Data rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);

  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      pdf.setFillColor(252, 252, 252);
      pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
    }

    const values = [item.time_text || '', getEventText(item), item.responsible || ''];
    xPos = margin + 2;
    values.forEach((value, colIdx) => {
      const colWidth = contentWidth * colWidths[colIdx];
      const truncatedValue = truncateText(pdf, value, colWidth - 4);
      pdf.text(truncatedValue, xPos, yPos + 5);
      xPos += colWidth;
    });

    yPos += rowHeight;
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.1);
    pdf.line(margin, yPos, margin + contentWidth, yPos);
  });

  return yPos + 8;
};

export const exportRunningSheetPDF = async (
  items: RunningSheetItem[],
  event: Event,
  sectionLabel: string = 'Running Sheet',
  sectionNotes: string | null = null
): Promise<void> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  const logoBase64 = await loadLogoAsBase64();

  let yPos = margin;

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.text(event.name, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Running Sheet', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  const receptionDate = formatDateWithOrdinal(event.date);
  const receptionVenue = event.venue || 'Venue TBD';
  const receptionTime = `${formatTimeDisplay(event.start_time)} - ${formatTimeDisplay(event.finish_time)}`;
  pdf.text(`Reception: ${receptionDate}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  pdf.text(`${receptionVenue} | ${receptionTime}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  if (event.ceremony_date) {
    const ceremonyDate = formatDateWithOrdinal(event.ceremony_date);
    const ceremonyVenue = event.ceremony_venue || 'Venue TBD';
    const ceremonyTime = `${formatTimeDisplay(event.ceremony_start_time)} - ${formatTimeDisplay(event.ceremony_finish_time)}`;
    pdf.text(`Ceremony: ${ceremonyDate}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    pdf.text(`${ceremonyVenue} | ${ceremonyTime}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  yPos += 2;
  pdf.setDrawColor(PURPLE.r, PURPLE.g, PURPLE.b);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  yPos = drawRunningSheetTable(pdf, items, yPos, pageWidth, margin, contentWidth, sectionLabel, sectionNotes);

  // Footer logo
  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, 'JPEG', (pageWidth - 35) / 2, pageHeight - margin - 10, 35, 10);
    } catch {}
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Generated: ${formatGeneratedTimestamp()}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

  const eventName = event.name.replace(/[^a-zA-Z0-9]/g, '_');
  pdf.save(`${eventName}-Running-Sheet-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportRunningSheetSectionPDF = exportRunningSheetPDF;
