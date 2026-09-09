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
import { PDF_DEFAULT_OPTIONS, savePdfAsync, yieldToBrowser } from '@/lib/pdfExportUtils';
const weddingWaitressLogo = '/wedding-waitress-logo-brown.png';

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
  return `${event.name}-Run Sheet-${formatPdfFileDate(event.date)}.pdf`;
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
  const hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${displayHour}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
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
  sectionNotes: string | null,
  sectionLabel: string,
  rowTextSize: "standard" | "larger" = "standard"
): string => {
  const rowFontPx = rowTextSize === "larger" ? 40 / 3 : 12;
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

  const notesBlock = sectionNotes?.trim() ? `
    <section style="margin-bottom:14px;color:#222;font-size:12px;line-height:18px;">
      <div data-pdf-block style="font-weight:bold;margin-bottom:4px;">Notes for Run Sheet</div>
      ${sectionNotes.split('\n').map(line => `<div data-pdf-block style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:18px;">${escapeHtml(line) || '&nbsp;'}</div>`).join('')}
    </section>` : '';

  const rows = items.map((item, idx) => {
    const bgColor = idx % 2 === 0 ? '#fafafa' : '#ffffff';
    let cellStyle = '';
    if (item.is_section_header) cellStyle += 'font-weight:bold;color:#dc2626;';
    if (item.is_bold) cellStyle += 'font-weight:bold;';
    if (item.is_italic) cellStyle += 'font-style:italic;';
    if (item.is_underline) cellStyle += 'text-decoration:underline;';
    return `
      <tr style="background:${bgColor};">
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:${rowFontPx}px;line-height:18px;overflow-wrap:anywhere;white-space:pre-wrap;vertical-align:top;width:10.6%;${cellStyle}">${textToHtmlLines(item.time_text || '')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:${rowFontPx}px;white-space:pre-wrap;vertical-align:top;width:69.4%;${cellStyle}">${textToHtmlLines(getEventText(item))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:${rowFontPx}px;white-space:pre-wrap;vertical-align:top;width:20%;${cellStyle}">${textToHtmlLines(item.responsible || '')}</td>
      </tr>
    `;
  }).join('');

  // No logo or footer in HTML — jsPDF handles that
  return `
    <div style="width:794px;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:40px 40px 0 40px;box-sizing:border-box;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:4px;">
        <div style="font-size:22px;font-weight:bold;color:#967A59;">${escapeHtml(event.name)}</div>
        <div style="font-size:16px;color:#222;margin-top:4px;">${escapeHtml(sectionLabel || 'Run Sheet')}</div>
      </div>
      <!-- Event details -->
      <div style="text-align:center;margin-bottom:6px;">
        ${detailsHtml}
      </div>
      <!-- Purple divider -->
      <div style="border-top:2px solid #967A59;margin:8px 0 14px 0;"></div>
      ${notesBlock}
      <!-- Table -->
      <table style="width:100%;table-layout:fixed;border-collapse:collapse;border:1px solid #ddd;">
        <thead>
          <tr style="background:#f3f3f3;">
<th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:10.6%;text-transform:uppercase;">Time</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:69.4%;text-transform:uppercase;">Event</th>
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
  sectionLabel: string = 'Run Sheet',
  sectionNotes: string | null = null,
  rowTextSize: "standard" | "larger" = "standard"
): Promise<void> => {
  const logoDataUrl = await loadLogoAsDataUrl();
  const htmlContent = generateRunningSheetHTML(items, event, sectionNotes, sectionLabel, rowTextSize);
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

    // Prefer row boundaries; for a row taller than a page, split only between text lines.
    const origin = container.getBoundingClientRect().top;
    const rows = Array.from(container.querySelectorAll('tbody tr, [data-pdf-block]')).map(row => ({
      top: Math.round(row.getBoundingClientRect().top - origin),
      bottom: Math.round(row.getBoundingClientRect().bottom - origin),
    }));
    const raster = fullCanvas.getContext('2d')!;
    const findTextGap = (limit: number, start: number) => {
      const top = Math.max(start + 1, limit - 80);
      const width = (PAGE_WIDTH_PX - 96) * SCALE;
      const pixels = raster.getImageData(48 * SCALE, top * SCALE, width, (limit - top) * SCALE);
      let clear = 0;
      for (let y = pixels.height - 1; y >= 0; y--) {
        let ink = false;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (Math.min(pixels.data[i], pixels.data[i+1], pixels.data[i+2]) < 150) { ink = true; break; }
        }
        clear = ink ? 0 : clear + 1;
        if (clear >= 3 * SCALE) return top + (y + clear / 2) / SCALE;
      }
      return limit;
    };
    const slices: {start:number; height:number}[] = [];
    let cursor = 0;
    while (cursor < contentHeight) {
      const capacity = slices.length ? usableHeightPage2PlusPx : usableHeightPage1Px;
      let end = Math.min(contentHeight, cursor + capacity);
      const crossing = rows.find(row => row.top < end && row.bottom > end);
      if (crossing) {
        if (crossing.top > cursor + 1) end = crossing.top;
        else end = findTextGap(end, cursor);
      }
      if (end < contentHeight && end > cursor + 1) end = findTextGap(end, cursor);
      if (end <= cursor) end = Math.min(contentHeight, cursor + capacity);
      slices.push({start:cursor, height:end-cursor});
      cursor = end;
    }
    const totalPages = slices.length;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', ...PDF_DEFAULT_OPTIONS });

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
        await yieldToBrowser();
      }

      // Calculate source Y offset and slice height in content pixels
      let srcY: number;
      let sliceHeight: number;
      let destY: number; // Y position in mm where the image starts on the PDF page

      srcY = slices[page].start;
      sliceHeight = slices[page].height;
      destY = page === 0 ? 0 : TOP_MARGIN_PAGE2_MM;

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

    await savePdfAsync(pdf, getRunningSheetPdfFileName(event));
  } finally {
    document.body.removeChild(container);
  }
};

export const exportRunningSheetSectionPDF = exportRunningSheetPDF;
