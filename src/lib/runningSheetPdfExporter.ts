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
 * Last updated: 2026-02-24 — Rewritten to use html2canvas approach (owner-approved)
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
  if (typeof item.description_rich === 'object' && item.description_rich?.text !== undefined) return item.description_rich.text;
  if (typeof item.description_rich === 'string') return item.description_rich;
  return '';
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
 * This HTML is rendered offscreen and captured by html2canvas.
 */
const generateRunningSheetHTML = (
  items: RunningSheetItem[],
  event: Event,
  sectionLabel: string,
  sectionNotes: string | null,
  logoDataUrl: string | null
): string => {
  const receptionDate = formatDateWithOrdinal(event.date);
  const receptionVenue = event.venue || 'Venue TBD';
  const receptionTime = `${formatTimeDisplay(event.start_time)} – ${formatTimeDisplay(event.finish_time)}`;

  let ceremonyBlock = '';
  if (event.ceremony_date) {
    const ceremonyDate = formatDateWithOrdinal(event.ceremony_date);
    const ceremonyVenue = event.ceremony_venue || 'Venue TBD';
    const ceremonyTime = `${formatTimeDisplay(event.ceremony_start_time)} – ${formatTimeDisplay(event.ceremony_finish_time)}`;
    ceremonyBlock = `
      <div style="color:#555;font-size:12px;margin-top:2px;">Ceremony: ${escapeHtml(ceremonyDate)}</div>
      <div style="color:#555;font-size:12px;">${escapeHtml(ceremonyVenue)} | ${ceremonyTime}</div>
    `;
  }

  let notesBlock = '';
  if (sectionNotes) {
    notesBlock = `<div style="font-style:italic;color:#777;font-size:11px;margin-bottom:6px;">Notes: ${escapeHtml(sectionNotes)}</div>`;
  }

  // Build table rows
  const rows = items.map((item, idx) => {
    const bgColor = idx % 2 === 0 ? '#fafafa' : '#ffffff';
    if (item.is_section_header) {
      return `
        <tr style="background:${bgColor};">
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-weight:bold;color:#dc2626;font-size:11px;white-space:pre-wrap;vertical-align:top;width:18%;">${textToHtmlLines(item.time_text || '')}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:11px;white-space:pre-wrap;vertical-align:top;width:52%;">${textToHtmlLines(getEventText(item))}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:11px;white-space:pre-wrap;vertical-align:top;width:30%;">${textToHtmlLines(item.responsible || '')}</td>
        </tr>
      `;
    }
    return `
      <tr style="background:${bgColor};">
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:11px;white-space:pre-wrap;vertical-align:top;width:18%;">${textToHtmlLines(item.time_text || '')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:11px;white-space:pre-wrap;vertical-align:top;width:52%;">${textToHtmlLines(getEventText(item))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:11px;white-space:pre-wrap;vertical-align:top;width:30%;">${textToHtmlLines(item.responsible || '')}</td>
      </tr>
    `;
  }).join('');

  const logoHtml = logoDataUrl
    ? `<div style="text-align:center;margin-top:20px;"><img src="${logoDataUrl}" style="height:28px;object-fit:contain;" /></div>`
    : '';

  return `
    <div style="width:794px;min-height:1123px;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:40px 48px 30px 48px;box-sizing:border-box;display:flex;flex-direction:column;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:4px;">
        <div style="font-size:22px;font-weight:bold;color:#6d28d9;">${escapeHtml(event.name)}</div>
        <div style="font-size:16px;color:#222;margin-top:4px;">Running Sheet</div>
      </div>
      <!-- Event details -->
      <div style="text-align:center;margin-bottom:6px;">
        <div style="color:#555;font-size:12px;">Reception: ${escapeHtml(receptionDate)}</div>
        <div style="color:#555;font-size:12px;">${escapeHtml(receptionVenue)} | ${receptionTime}</div>
        ${ceremonyBlock}
      </div>
      <!-- Purple divider -->
      <div style="border-top:2px solid #6d28d9;margin:8px 0 14px 0;"></div>
      <!-- Section label -->
      <div style="font-size:15px;font-weight:bold;color:#6d28d9;margin-bottom:4px;">${escapeHtml(sectionLabel)}</div>
      ${notesBlock}
      <!-- Table -->
      <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;">
        <thead>
          <tr style="background:#f3f3f3;">
            <th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:18%;text-transform:uppercase;">Time</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:52%;text-transform:uppercase;">Event</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;font-weight:bold;color:#555;border-bottom:2px solid #ccc;width:30%;text-transform:uppercase;">Who</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <!-- Spacer pushes footer down -->
      <div style="flex:1;"></div>
      <!-- Footer -->
      ${logoHtml}
      <div style="text-align:right;font-size:8px;color:#aaa;margin-top:8px;">Generated: ${formatGeneratedTimestamp()}</div>
    </div>
  `;
};

/**
 * Load logo as a data URL for embedding in the HTML.
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
 * Render the running sheet HTML offscreen, capture with html2canvas,
 * and produce a multi-page A4 PDF.
 */
export const exportRunningSheetPDF = async (
  items: RunningSheetItem[],
  event: Event,
  sectionLabel: string = 'Running Sheet',
  sectionNotes: string | null = null
): Promise<void> => {
  const logoDataUrl = await loadLogoAsDataUrl();
  const htmlContent = generateRunningSheetHTML(items, event, sectionLabel, sectionNotes, logoDataUrl);

  // Create offscreen container — let it grow to full content height
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  document.body.appendChild(container);

  try {
    // Wait for rendering + fonts
    await new Promise(resolve => setTimeout(resolve, 500));
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const contentHeight = container.scrollHeight;
    const pageHeightPx = 1123; // A4 height at 96 DPI
    const pageWidthPx = 794;
    const totalPages = Math.max(1, Math.ceil(contentHeight / pageHeightPx));

    // Capture the full content as one tall canvas
    const fullCanvas = await html2canvas(container, {
      width: pageWidthPx,
      height: contentHeight,
      scale: 3,
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

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = 210;
    const pdfHeight = 297;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Slice canvas for this page
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = pageWidthPx * 3;
      const sliceHeightPx = Math.min(pageHeightPx, contentHeight - page * pageHeightPx);
      sliceCanvas.height = sliceHeightPx * 3;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          fullCanvas,
          0, page * pageHeightPx * 3,
          pageWidthPx * 3, sliceHeightPx * 3,
          0, 0,
          pageWidthPx * 3, sliceHeightPx * 3
        );
      }

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const imgHeight = (sliceHeightPx / pageHeightPx) * pdfHeight;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
    }

    const eventName = event.name.replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`${eventName}-Running-Sheet-${new Date().toISOString().split('T')[0]}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};

export const exportRunningSheetSectionPDF = exportRunningSheetPDF;
