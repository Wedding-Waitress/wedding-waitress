/**
 * Invitation Export Engine
 * Generates high-res PNG, PDF (single + 2-up A4), and bulk personalised exports.
 */
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { TextZone } from '@/hooks/useInvitationTemplates';
import { waitForFonts } from '@/lib/googleFonts';
import type { QrConfig } from '@/lib/invitationQR';
import { PDF_DEFAULT_OPTIONS, savePdfAsync, yieldToBrowser } from '@/lib/pdfExportUtils';
import { weddingFontFamilyStack } from '@/lib/localWeddingFonts';

// Card sizes in mm
const A6_W_MM = 105;
const A6_H_MM = 148;
const A5_W_MM = 148;
const A5_H_MM = 210;
const A4_W_MM = 210;
const A4_H_MM = 297;

// 300 DPI scale factor (300 / 96 ≈ 3.125)
const DPI_SCALE = 3.125;

interface ExportOptions {
  backgroundUrl: string;
  orientation: string;
  widthMm: number;
  heightMm: number;
  textZones: TextZone[];
  customText: Record<string, string>;
  customStyles: Record<string, any>;
  eventData: Record<string, string>;
  qrConfig?: QrConfig;
  qrDataUrl?: string;
}

interface BulkGuest {
  id: string;
  first_name: string;
  last_name?: string | null;
}

/** Build offscreen invitation HTML and capture at 300 DPI.
 *  When `includeQr` is false, the QR is omitted so it can be drawn directly
 *  onto the PDF via jsPDF.addImage (crisper + html2canvas occasionally drops
 *  data-URL <img> tags, which would cause the QR to disappear from prints). */
export function buildInvitationElement(opts: ExportOptions, guestName?: string, includeQr = true): HTMLDivElement {
  const { backgroundUrl, orientation, widthMm, heightMm, textZones, customText, customStyles, eventData, qrConfig, qrDataUrl } = opts;
  const isPortrait = orientation === 'portrait';
  const wPx = (widthMm / 25.4) * 300; // 300 DPI pixels
  const hPx = (heightMm / 25.4) * 300;

  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute; left: -99999px; top: -99999px;
    width: ${wPx}px; height: ${hPx}px; overflow: hidden;
    font-family: sans-serif;
  `;

  // Background image
  const bg = document.createElement('img');
  bg.crossOrigin = 'anonymous';
  bg.src = backgroundUrl;
  bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`;
  container.appendChild(bg);

  // Text zones
  textZones.forEach(zone => {
    const el = document.createElement('div');
    const overrides = customStyles[zone.id] || {};
    let text = customText[zone.id] || '';
    if (!text && (zone as any).text) text = (zone as any).text;
    if (!text && (zone as any).type === 'preset' && (zone as any).preset_field && eventData[(zone as any).preset_field]) {
      text = eventData[(zone as any).preset_field];
    }
    if (!text && zone.type === 'auto' && zone.auto_field && eventData[zone.auto_field]) {
      text = eventData[zone.auto_field];
    }
    if (!text && zone.type === 'guest_name' && guestName) {
      text = guestName;
    }
    if (!text) text = zone.default_text || '';

    const fontSize = overrides.font_size || zone.font_size;
    const scaledFontSize = fontSize * DPI_SCALE;

    el.textContent = text;
    el.style.cssText = `
      position: absolute;
      left: ${zone.x_percent - zone.width_percent / 2}%;
      top: ${zone.y_percent - 3}%;
      width: ${zone.width_percent}%;
      font-family: ${weddingFontFamilyStack(overrides.font_family || zone.font_family)};
      font-size: ${scaledFontSize}px;
      font-weight: ${(zone as any).font_style === 'bold' ? '700' : (overrides.font_weight || zone.font_weight)};
      font-style: ${(zone as any).font_style === 'italic' ? 'italic' : 'normal'};
      text-decoration: ${(zone as any).font_style === 'underline' ? 'underline' : 'none'};
      color: ${overrides.font_color || zone.font_color};
      text-align: ${overrides.text_align || zone.text_align};
      letter-spacing: ${(overrides.letter_spacing ?? (zone as any).letter_spacing ?? 0) * DPI_SCALE}px;
      line-height: 1.3;
      white-space: pre-wrap;
      transform: rotate(${(zone as any).rotation || 0}deg);
      transform-origin: center center;
    `;
    container.appendChild(el);
  });

  // QR Code overlay (only when capturing for PNG export — PDF path adds QR
  // directly via jsPDF for crisp rendering + guaranteed inclusion).
  if (includeQr && qrConfig?.enabled && qrDataUrl) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position: absolute;
      left: ${qrConfig.x_percent - qrConfig.size_percent / 2}%;
      top: ${qrConfig.y_percent - qrConfig.size_percent / 2}%;
      width: ${qrConfig.size_percent}%;
      aspect-ratio: 1 / 1;
      background: #ffffff;
    `;
    const qrImg = document.createElement('img');
    qrImg.src = qrDataUrl;
    qrImg.style.cssText = `width: 100%; height: 100%; display: block;`;
    wrap.appendChild(qrImg);
    container.appendChild(wrap);
  }

  return container;
}

/** Draw the QR (with tight white plate) directly into a jsPDF page,
 *  using the exact same percent math as the on-page preview so the position
 *  is pixel-identical. */
function drawQrOnPdf(
  pdf: jsPDF,
  qrConfig: QrConfig | undefined,
  qrDataUrl: string | undefined,
  offsetXMm: number,
  offsetYMm: number,
  widthMm: number,
  heightMm: number,
) {
  if (!qrConfig?.enabled || !qrDataUrl) return;
  const qrSizeMm = (qrConfig.size_percent / 100) * widthMm;
  const qrXMm = offsetXMm + ((qrConfig.x_percent - qrConfig.size_percent / 2) / 100) * widthMm;
  const qrYMm = offsetYMm + ((qrConfig.y_percent - qrConfig.size_percent / 2) / 100) * heightMm;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(qrXMm, qrYMm, qrSizeMm, qrSizeMm, 'F');
  pdf.addImage(qrDataUrl, 'PNG', qrXMm, qrYMm, qrSizeMm, qrSizeMm, undefined, 'NONE');
}

export async function captureElement(el: HTMLDivElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(el);
  // Wait for images to load
  const imgs = el.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map(img =>
    img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); })
  ));
  // Wait for Google Fonts to finish loading
  const usedFonts = Array.from(el.querySelectorAll('div')).map(d => d.style.fontFamily?.split(',')[0]?.trim()).filter(Boolean);
  if (usedFonts.length > 0) await waitForFonts(usedFonts);
  await new Promise(r => setTimeout(r, 300));
  const canvas = await html2canvas(el, {
    scale: 1, // already at 300 DPI size
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
  });
  document.body.removeChild(el);
  return canvas;
}

/** Export single invitation as PNG (downloads) */
export async function exportInvitationPNG(opts: ExportOptions, guestName?: string): Promise<void> {
  const el = buildInvitationElement(opts, guestName);
  const canvas = await captureElement(el);
  const link = document.createElement('a');
  link.download = `invitation${guestName ? `-${guestName.replace(/\s+/g, '-')}` : ''}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/** Export single invitation as PDF */
export async function exportInvitationPDF(opts: ExportOptions, guestName?: string, fileName?: string): Promise<void> {
  const el = buildInvitationElement(opts, guestName, false);
  const canvas = await captureElement(el);
  const pdf = new jsPDF({
    orientation: opts.orientation === 'portrait' ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [opts.widthMm, opts.heightMm],
    ...PDF_DEFAULT_OPTIONS,
  });
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, opts.widthMm, opts.heightMm);
  drawQrOnPdf(pdf, opts.qrConfig, opts.qrDataUrl, 0, 0, opts.widthMm, opts.heightMm);
  await savePdfAsync(pdf, fileName || `invitation${guestName ? `-${guestName.replace(/\s+/g, '-')}` : ''}.pdf`);
}

/** Export 2-up A4 layout (two A5 invitations per page) */
export async function exportInvitation2Up(opts: ExportOptions): Promise<void> {
  const el = buildInvitationElement(opts, undefined, false);
  const canvas = await captureElement(el);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', ...PDF_DEFAULT_OPTIONS });

  // Center horizontally on A4
  const offsetX = (A4_W_MM - A5_W_MM) / 2;
  // Two invitations vertically
  const gap = (A4_H_MM - A5_H_MM * 2) / 3;

  // Top invitation
  pdf.addImage(imgData, 'PNG', offsetX, gap, A5_W_MM, A5_H_MM);
  drawQrOnPdf(pdf, opts.qrConfig, opts.qrDataUrl, offsetX, gap, A5_W_MM, A5_H_MM);
  // Bottom invitation
  pdf.addImage(imgData, 'PNG', offsetX, gap * 2 + A5_H_MM, A5_W_MM, A5_H_MM);
  drawQrOnPdf(pdf, opts.qrConfig, opts.qrDataUrl, offsetX, gap * 2 + A5_H_MM, A5_W_MM, A5_H_MM);

  // Crop marks (thin grey lines)
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  const positions = [
    { x: offsetX, y: gap },
    { x: offsetX + A5_W_MM, y: gap },
    { x: offsetX, y: gap + A5_H_MM },
    { x: offsetX + A5_W_MM, y: gap + A5_H_MM },
    { x: offsetX, y: gap * 2 + A5_H_MM },
    { x: offsetX + A5_W_MM, y: gap * 2 + A5_H_MM },
    { x: offsetX, y: gap * 2 + A5_H_MM * 2 },
    { x: offsetX + A5_W_MM, y: gap * 2 + A5_H_MM * 2 },
  ];
  positions.forEach(({ x, y }) => {
    pdf.line(x - 5, y, x - 1, y); // left tick
    pdf.line(x + 1, y, x + 5, y); // right tick (if at right edge, these swap)
    pdf.line(x, y - 5, x, y - 1); // top tick
    pdf.line(x, y + 1, x, y + 5); // bottom tick
  });

  await savePdfAsync(pdf, 'invitation-2up-A4.pdf');
}

/** Bulk export: one personalised invitation per guest as multi-page PDF */
export async function exportBulkPDF(
  opts: ExportOptions,
  guests: BulkGuest[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  if (guests.length === 0) return;

  const pdf = new jsPDF({
    orientation: opts.orientation === 'portrait' ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [opts.widthMm, opts.heightMm],
    ...PDF_DEFAULT_OPTIONS,
  });

  for (let i = 0; i < guests.length; i++) {
    const guest = guests[i];
    const name = `${guest.first_name}${guest.last_name ? ' ' + guest.last_name : ''}`;
    if (i > 0) {
      pdf.addPage([opts.widthMm, opts.heightMm]);
      await yieldToBrowser();
    }

    const el = buildInvitationElement(opts, name, false);
    const canvas = await captureElement(el);
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, opts.widthMm, opts.heightMm);
    drawQrOnPdf(pdf, opts.qrConfig, opts.qrDataUrl, 0, 0, opts.widthMm, opts.heightMm);

    onProgress?.(i + 1, guests.length);
  }

  await savePdfAsync(pdf, 'invitations-all-guests.pdf');
}
