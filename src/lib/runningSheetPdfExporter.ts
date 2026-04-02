/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This Running Sheet feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break running sheet data, sharing, or PDF export
 *
 * Last locked: 2026-02-24
 * Last locked: 2026-04-02
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RunningSheetItem } from '@/types/runningSheet';
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';

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

// --- Layout constants (mm) ---
const PDF_WIDTH_MM = 210;
const PDF_HEIGHT_MM = 297;
const FOOTER_ZONE_MM = 30;
const TOP_MARGIN_PAGE2_MM = 12;
const FOOTER_LOGO_HEIGHT_MM = 12;
const FOOTER_LOGO_WIDTH_MM = 42;
const FOOTER_TEXT_Y_MM = PDF_HEIGHT_MM - 5; // 5mm from bottom
const FOOTER_LOGO_Y_MM = FOOTER_TEXT_Y_MM - FOOTER_LOGO_HEIGHT_MM - 2;
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123; // A4 at 96 DPI
const SCALE = 3;

// Pixel equivalents for reserving space
const FOOTER_ZONE_PX = Math.round((FOOTER_ZONE_MM / PDF_HEIGHT_MM) * PAGE_HEIGHT_PX);
const TOP_MARGIN_PAGE2_PX = Math.round((TOP_MARGIN_PAGE2_MM / PDF_HEIGHT_MM) * PAGE_HEIGHT_PX);

const formatPdfFileDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }
  const date = new Date(dateString + 'T00:00:00');
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

const getRunningSheetPdfFileName = (event: Event): string => {
  return `${event.name}-Running Sheet-${formatPdfFileDate(event.date)}.pdf`;
};

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

const getEventText = (item: RunningSheetItem): string => {
  const rich = item.description_rich;
  if (!rich || typeof rich === 'string') return rich || '';
  const parts: string[] = [];
  if (rich.text) parts.push(rich.text);
  if (Array.isArray(rich.bullets)) {
    rich.bullets.forEach((b: string) => parts.push(`• ${b}`));
  }
  if (rich.subText) parts.push(rich.subText);
  return parts.join('\n');
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const textToHtmlLines = (text: string): string => {
  return escapeHtml(text).replace(/\n/g, '<br/>');
};

/**
 * Generate the full HTML for the running sheet page content.
 * Footer is now drawn by jsPDF, so we remove the logo and generated timestamp from the HTML.
 */
const generateRunningSheetHTML = (
  items: RunningSheetItem[],
  event: Event,
  sectionNotes: string | null
): string => {
  const receptionDate = formatDateWithOrdinal(event.date);
  const receptionVenue = event.venue || 'Venue TBD';
  const receptionTime = `${formatTimeDisplay(event.start_time)} – ${formatTimeDisplay(event.finish_time)}`;

  const detailLines: string[] = [];
  if (event.ceremony_date) {
    const ceremonyDate = formatDateWithOrdinal(event.ceremony_date);
    const ceremonyVenue = event.ceremony_venue || 'Venue TBD';
    const ceremonyTime = `${formatTimeDisplay(event.ceremony_start_time)} – ${formatTimeDisplay(event.ceremony_finish_time)}`;
    detailLines.push(`Ceremony: ${escapeHtml(ceremonyDate)} | ${escapeHtml(ceremonyVenue)} | ${ceremonyTime}`);
  }
  detailLines.push(`Reception: ${escapeHtml(receptionDate)} | ${escapeHtml(receptionVenue)} | ${receptionTime}`);

  const detailsHtml = detailLines.map(line => `<div style="color:#555;font-size:12px;margin-top:2px;">${line}</div>`).join('');

  let notesBlock = '';
  if (sectionNotes) {
    notesBlock = `<div style="font-style:italic;color:#777;font-size:12px;margin-bottom:6px;">Notes: ${escapeHtml(sectionNotes)}</div>`;
  }

  const rows = items.map((item, idx) => {
    const bgColor = idx % 2 === 0 ? '#fafafa' : '#ffffff';
    let cellStyle = '';
    if (item.is_section_header) cellStyle += 'font-weight:bold;color:#dc2626;';
    if (item.is_bold) cellStyle += 'font-weight:bold;';
    if (item.is_italic) cellStyle += 'font-style:italic;';
    if (item.is_underline) cellStyle += 'text-decoration:underline;';
    return `
      <tr style="background:${bgColor};">
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;white-space:pre-wrap;vertical-align:top;width:15%;${cellStyle}">${textToHtmlLines(item.time_text || '')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;white-space:pre-wrap;vertical-align:top;width:65%;${cellStyle}">${textToHtmlLines(getEventText(item))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;white-space:pre-wrap;vertical-align:top;width:20%;${cellStyle}">${textToHtmlLines(item.responsible || '')}</td>
      </tr>
    `;
  }).join('');

  // No logo or footer in HTML — jsPDF handles that
  return `
    <div style="width:794px;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:40px 48px 0 48px;box-sizing:border-box;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:4px;">
        <div style="font-size:22px;font-weight:bold;color:#6d28d9;">${escapeHtml(event.name)}</div>
        <div style="font-size:16px;color:#222;margin-top:4px;">Running Sheet</div>
      </div>
      <!-- Event details -->
      <div style="text-align:center;margin-bottom:6px;">
        ${detailsHtml}
      </div>
      <!-- Purple divider -->
      <div style="border-top:2px solid #6d28d9;margin:8px 0 14px 0;"></div>
      ${notesBlock}
      <!-- Table -->
      <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;">
        <thead>
          <tr style="background:#f3f3f3;">
            <th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:15%;text-transform:uppercase;">Time</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:65%;text-transform:uppercase;">Event</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:20%;text-transform:uppercase;">Who</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Load logo as a data URL for embedding via jsPDF.
 */
const loadLogoAsDataUrl = async (): Promise<string | null> => {
  try {
    const response = await fetch(weddingWaitressLogo);
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

/**
 * Draw the footer on the current jsPDF page: white zone, logo, page number, generated timestamp.
 */
const drawPageFooter = (
  pdf: jsPDF,
  logoDataUrl: string | null,
  pageNum: number,
  totalPages: number,
  timestamp: string
) => {
  // White rectangle to cover any bleeding content
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, PDF_HEIGHT_MM - FOOTER_ZONE_MM, PDF_WIDTH_MM, FOOTER_ZONE_MM, 'F');

  // Logo centered
  if (logoDataUrl) {
    const logoX = (PDF_WIDTH_MM - FOOTER_LOGO_WIDTH_MM) / 2;
    try {
      pdf.addImage(logoDataUrl, 'PNG', logoX, FOOTER_LOGO_Y_MM, FOOTER_LOGO_WIDTH_MM, FOOTER_LOGO_HEIGHT_MM);
    } catch {
      // silently skip if logo fails
    }
  }

  // Page number (left) and Generated timestamp (right)
  pdf.setFontSize(7);
  pdf.setTextColor(170, 170, 170);
  pdf.text(`Page ${pageNum} of ${totalPages}`, 12, FOOTER_TEXT_Y_MM);
  pdf.text(`Generated: ${timestamp}`, PDF_WIDTH_MM - 12, FOOTER_TEXT_Y_MM, { align: 'right' });
};

/**
 * Draw a white top margin overlay on pages 2+ so content doesn't start at the very edge.
 */
const drawTopMarginOverlay = (pdf: jsPDF) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PDF_WIDTH_MM, TOP_MARGIN_PAGE2_MM, 'F');
};

/**
 * Render the running sheet HTML offscreen, capture with html2canvas,
 * and produce a multi-page A4 PDF with per-page footers.
 */
export const exportRunningSheetPDF = async (
  items: RunningSheetItem[],
  event: Event,
  sectionLabel: string = 'Running Sheet',
  sectionNotes: string | null = null
): Promise<void> => {
  void sectionLabel;
  const logoDataUrl = await loadLogoAsDataUrl();
  const htmlContent = generateRunningSheetHTML(items, event, sectionNotes);
  const timestamp = formatGeneratedTimestamp();

  // Create offscreen container
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${PAGE_WIDTH_PX}px`;
  container.style.backgroundColor = '#ffffff';
  document.body.appendChild(container);

  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const contentHeight = container.scrollHeight;

    // Capture the full content as one tall canvas
    const fullCanvas = await html2canvas(container, {
      width: PAGE_WIDTH_PX,
      height: contentHeight,
      scale: SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      allowTaint: false,
      logging: false,
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    // Calculate usable content height per page (excluding footer zone)
    const usableHeightPage1Px = PAGE_HEIGHT_PX - FOOTER_ZONE_PX;
    const usableHeightPage2PlusPx = PAGE_HEIGHT_PX - FOOTER_ZONE_PX - TOP_MARGIN_PAGE2_PX;

    // Calculate total pages
    let totalPages = 1;
    let remaining = contentHeight - usableHeightPage1Px;
    if (remaining > 0) {
      totalPages += Math.ceil(remaining / usableHeightPage2PlusPx);
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Calculate source Y offset and slice height in content pixels
      let srcY: number;
      let sliceHeight: number;
      let destY: number; // Y position in mm where the image starts on the PDF page

      if (page === 0) {
        srcY = 0;
        sliceHeight = Math.min(usableHeightPage1Px, contentHeight);
        destY = 0;
      } else {
        srcY = usableHeightPage1Px + (page - 1) * usableHeightPage2PlusPx;
        sliceHeight = Math.min(usableHeightPage2PlusPx, contentHeight - srcY);
        destY = TOP_MARGIN_PAGE2_MM; // leave top margin on pages 2+
      }

      // Create slice canvas
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = PAGE_WIDTH_PX * SCALE;
      sliceCanvas.height = sliceHeight * SCALE;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          fullCanvas,
          0, srcY * SCALE,
          PAGE_WIDTH_PX * SCALE, sliceHeight * SCALE,
          0, 0,
          PAGE_WIDTH_PX * SCALE, sliceHeight * SCALE
        );
      }

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const imgHeightMm = (sliceHeight / PAGE_HEIGHT_PX) * PDF_HEIGHT_MM;
      const imgWidthMm = PDF_WIDTH_MM;

      pdf.addImage(imgData, 'JPEG', 0, destY, imgWidthMm, imgHeightMm);

      // Draw top margin overlay on pages 2+
      if (page > 0) {
        drawTopMarginOverlay(pdf);
      }

      // Draw footer on every page
      drawPageFooter(pdf, logoDataUrl, page + 1, totalPages, timestamp);
    }

    pdf.save(getRunningSheetPdfFileName(event));
  } finally {
    document.body.removeChild(container);
  }
};

export const exportRunningSheetSectionPDF = exportRunningSheetPDF;
