/// <reference lib="es2022.intl" />
/** Individual keepsake PDFs. Canvas preserves browser font fallback, including emoji.
 * Each physical A4 page is rendered independently: no screenshot slicing or clipped lines.
 * This exporter has no separate preview layout and does not modify dashboard cards.
 */
import { PDF_DEFAULT_OPTIONS, savePdfAsync, yieldToBrowser } from './pdfExportUtils';
import { guestbookPdfFilename } from './guestbookFilename';
import { fitDocumentFooterLogo } from './documentFooterLogo';

export interface GuestbookPdfMessage {
  seq?: number | null;
  name?: string | null;
  message: string;
  at?: string | null;
  hasRecording?: boolean;
}
export interface GuestbookPdfEvent { name?: string | null; date?: string | null }
const WIDTH = 794;
const HEIGHT = 1123;
const LEFT = 91;
const RIGHT = WIDTH - LEFT;
const BOTTOM = 980;
const FONT = 'Manrope, "Segoe UI", "Segoe UI Emoji", sans-serif';
const TITLE_FONT = '"Wedding Waitress Playfair", "Playfair Display", Georgia, serif';

/** Wrap whole words, falling back to grapheme boundaries for long unbroken text. */
export function wrapGuestbookText(text: string, width: number, measure: (s: string) => number): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return text.replace(/\r\n?/g, '\n').split('\n').flatMap(paragraph => {
    if (!paragraph) return [''];
    const lines: string[] = [];
    let line = '';
    for (const token of paragraph.match(/\S+|[^\S\n]+/gu) || []) {
      if (measure(line + token) <= width) { line += token; continue; }
      if (line.trim()) { lines.push(line.trimEnd()); line = ''; }
      if (!token.trim()) continue;
      for (const { segment } of segmenter.segment(token)) {
        if (line && measure(line + segment) > width) { lines.push(line); line = ''; }
        line += segment;
      }
    }
    if (line || !lines.length) lines.push(line.trimEnd());
    return lines;
  });
}

export function guestbookEventDate(value?: string | null): string {
  if (!value) return '';
  // Parse date-only values locally, avoiding the UTC day shift in western time zones.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });
}

export async function createGuestbookMessagePdf(message: GuestbookPdfMessage, event: GuestbookPdfEvent) {
  // Match the agreed heading font; keep message text in the existing Manrope.
  await Promise.all([document.fonts.load('400 17px Manrope'), document.fonts.load('600 28px "Wedding Waitress Playfair"')]);
  await document.fonts.ready;
  const logo = new Image();
  logo.src = '/wedding-waitress-document-footer-dark-brown.png';
  await logo.decode();
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ ...PDF_DEFAULT_OPTIONS, unit: 'mm', format: 'a4' });
  pdf.setProperties({ title: `${event.name || 'Event'} Guestbook`, subject: 'Messages from your guests', creator: 'Wedding Waitress' });
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * 2;
  canvas.height = HEIGHT * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('PDF drawing is unavailable. Please try another browser.');
  ctx.scale(2, 2);
  const font = (size: number, weight = 400, family = FONT) => { ctx.font = `${weight} ${size}px ${family}`; };
  const wrap = (text: string) => wrapGuestbookText(text, RIGHT - LEFT, s => ctx.measureText(s).width);
  const title = event.name?.trim() || 'Event';
  let titleSize = 28;
  font(titleSize, 600, TITLE_FONT);
  let titleLines = wrap(title);
  while (titleLines.length > 4 && titleSize > 12) { font(--titleSize, 600, TITLE_FONT); titleLines = wrap(title); }
  const eventDate = guestbookEventDate(event.date);
  const submitted = message.at ? new Date(message.at) : null;
  const validDate = submitted && !Number.isNaN(submitted.getTime()) ? submitted : null;
  const details = [
    `Guest: ${message.name?.trim() || 'Anonymous guest'}`,
    `Date: ${validDate ? validDate.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not recorded'}`,
    `Time: ${validDate ? validDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Not recorded'}`,
  ];
  font(16);
  const detailLines = details.flatMap(wrap);
  font(16);
  const messageLines = wrap(message.message);
  // Metadata flows with the message, so even an unusually long guest name is preserved.
  const content = [
    ...detailLines.map(text => ({ text, size: 16, height: 25 })),
    { text: '', size: 16, height: 28 },
    ...messageLines.map(text => ({ text, size: 16, height: 29 })),
  ];
  const contentTop = 96 + titleLines.length * (titleSize + 9) + 90 + (eventDate ? 29 : 0);
  const pages: typeof content[] = [];
  let page: typeof content = [];
  let y = contentTop;
  for (const line of content) {
    if (y + line.height > BOTTOM && page.length) { pages.push(page); page = []; y = contentTop; }
    page.push(line); y += line.height;
  }
  if (page.length) pages.push(page);
  for (let index = 0; index < pages.length; index++) {
    if (index) pdf.addPage();
    ctx.fillStyle = '#fcf9f3'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = '#967a59'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.roundRect(38, 38, WIDTH - 76, HEIGHT - 76, 8); ctx.stroke();
    const rule = (at: number) => { ctx.beginPath(); ctx.moveTo(LEFT, at); ctx.lineTo(RIGHT, at); ctx.stroke(); };
    rule(80);
    ctx.fillStyle = '#000000'; ctx.textBaseline = 'top'; ctx.textAlign = 'center'; font(titleSize, 600, TITLE_FONT);
    let titleY = 96;
    for (const text of titleLines) { ctx.fillText(text, WIDTH / 2, titleY); titleY += titleSize + 9; }
    rule(titleY + 5);
    font(16); ctx.fillText('Messages from your guests', WIDTH / 2, titleY + 29);
    if (eventDate) { font(16); ctx.fillText(eventDate, WIDTH / 2, titleY + 59); }
    ctx.textAlign = 'left'; y = contentTop;
    for (const line of pages[index]) { font(line.size); ctx.fillText(line.text, LEFT, y); y += line.height; }
    ctx.textAlign = 'center'; font(12);
    const seq = message.seq && message.seq > 0 ? `Message ${String(Math.floor(message.seq)).padStart(2, '0')}  ·  ` : '';
    ctx.fillText(`${seq}Page ${index + 1} of ${pages.length}`, WIDTH / 2, HEIGHT - 112);
    const logoSize = fitDocumentFooterLogo(174, 42);
    ctx.drawImage(logo, (WIDTH - logoSize.width) / 2, HEIGHT - 90, logoSize.width, logoSize.height);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
    await yieldToBrowser();
  }
  canvas.width = canvas.height = 0;
  return pdf;
}

export async function downloadGuestbookMessagePdf(message: GuestbookPdfMessage, event: GuestbookPdfEvent) {
  const pdf = await createGuestbookMessagePdf(message, event);
  await savePdfAsync(pdf, guestbookPdfFilename(message.seq, event.name, event.date));
}
