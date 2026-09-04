/**
 * Signage-only PDF exporter.
 *
 * Why this exists (do not merge with invitationExporter):
 *   Seating Chart Signs print at A1/A2 sizes. The invitation exporter builds
 *   an offscreen DOM the size of the final print at 300 DPI and html2canvas's
 *   the whole thing — for A1 that's ~7016×9933px, which freezes the browser
 *   and frequently aborts. This exporter instead:
 *
 *     1. Embeds the master background image directly into jsPDF via addImage.
 *        jsPDF stores the JPEG bytes as-is, so full master resolution is kept
 *        with zero browser rasterisation cost.
 *     2. Rasterises ONLY the text/QR overlay (transparent background) at
 *        A4-sized pixels regardless of print size. Overlay is vector-light
 *        so a 2400×3400px canvas is plenty for crisp text on A1 prints.
 *
 *   Result: print-shop quality PDF, no browser freeze, no html2canvas timeout.
 */
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { TextZone } from '@/hooks/useInvitationTemplates';
import type { QrConfig } from '@/lib/invitationQR';
import { waitForFonts } from '@/lib/googleFonts';
import { PDF_DEFAULT_OPTIONS, savePdfAsync, yieldToBrowser } from '@/lib/pdfExportUtils';
import { weddingFontFamilyStack } from '@/lib/localWeddingFonts';

export interface SignagePdfOptions {
  backgroundUrl: string;
  backgroundColor?: string;
  widthMm: number;
  heightMm: number;
  textZones: TextZone[];
  customText: Record<string, string>;
  customStyles: Record<string, any>;
  eventData: Record<string, string>;
  qrConfig?: QrConfig;
  qrDataUrl?: string;
}

/** Fetch a URL and return both its data URL and detected MIME type. */
async function urlToDataUrl(url: string): Promise<{ dataUrl: string; mime: string }> {
  const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
  if (!res.ok) throw new Error(`Background image fetch failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  const mime = blob.type || 'image/jpeg';
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read background image bytes'));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, mime };
}

/** Build a transparent overlay element sized to A4-like pixel dimensions. */
function buildOverlayElement(opts: SignagePdfOptions, basePx: { w: number; h: number }): HTMLDivElement {
  const { textZones, customText, customStyles, eventData, qrConfig, qrDataUrl } = opts;
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute; left: -99999px; top: -99999px;
    width: ${basePx.w}px; height: ${basePx.h}px; overflow: hidden;
    background: transparent;
    font-family: sans-serif;
  `;

  textZones.forEach((zone: any) => {
    const el = document.createElement('div');
    const overrides = customStyles[zone.id] || {};
    let text = customText[zone.id] || '';
    if (!text && zone.text) text = zone.text;
    if (!text && zone.type === 'preset' && zone.preset_field && eventData[zone.preset_field]) {
      text = eventData[zone.preset_field];
    }
    if (!text && zone.type === 'auto' && zone.auto_field && eventData[zone.auto_field]) {
      text = eventData[zone.auto_field];
    }
    if (!text) text = zone.default_text || '';

    // Font size scales with overlay pixel size. Designer font_size is calibrated for
    // ~794px (A4 width); scale linearly so prints at any size look proportional.
    const baseFontSize = overrides.font_size || zone.font_size || 16;
    const scale = basePx.w / 794;
    const fontSize = baseFontSize * scale;

    el.textContent = text;
    el.style.cssText = `
      position: absolute;
      left: ${zone.x_percent - zone.width_percent / 2}%;
      top: ${zone.y_percent - 3}%;
      width: ${zone.width_percent}%;
      font-family: ${weddingFontFamilyStack(overrides.font_family || zone.font_family)};
      font-size: ${fontSize}px;
      font-weight: ${zone.font_style === 'bold' ? '700' : (overrides.font_weight || zone.font_weight || 400)};
      font-style: ${zone.font_style === 'italic' ? 'italic' : 'normal'};
      text-decoration: ${zone.font_style === 'underline' ? 'underline' : 'none'};
      color: ${overrides.font_color || zone.font_color || '#000'};
      text-align: ${overrides.text_align || zone.text_align || 'center'};
      letter-spacing: ${(overrides.letter_spacing ?? zone.letter_spacing ?? 0) * scale}px;
      line-height: 1.3;
      white-space: pre-wrap;
      transform: rotate(${zone.rotation || 0}deg);
      transform-origin: center center;
    `;
    container.appendChild(el);
  });

  // NOTE: QR is added directly to the PDF via jsPDF.addImage (not html2canvas)
  // to guarantee crisp rendering — html2canvas occasionally drops data-URL <img> tags.

  return container;
}

async function captureOverlay(el: HTMLDivElement): Promise<HTMLCanvasElement> {
  document.body.appendChild(el);
  try {
    const imgs = el.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(img =>
      img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); })
    ));
    const usedFonts = Array.from(el.querySelectorAll('div'))
      .map(d => d.style.fontFamily?.split(',')[0]?.trim())
      .filter(Boolean) as string[];
    if (usedFonts.length) await waitForFonts(usedFonts);
    await new Promise(r => setTimeout(r, 150));
    return await html2canvas(el, {
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null, // transparent
      logging: false,
    });
  } finally {
    document.body.removeChild(el);
  }
}

export async function exportSignagePDF(opts: SignagePdfOptions, fileName: string): Promise<void> {
  const { widthMm, heightMm, backgroundUrl, backgroundColor } = opts;

  const pdf = new jsPDF({
    orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
    ...PDF_DEFAULT_OPTIONS,
  });

  // 1. Background fill colour (always paint first so any transparency shows through nicely).
  if (backgroundColor) {
    try {
      const hex = backgroundColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(0, 0, widthMm, heightMm, 'F');
      }
    } catch { /* ignore color parse */ }
  }

  // 2. Embed master background image directly (no browser rasterisation).
  if (backgroundUrl) {
    await yieldToBrowser();
    const { dataUrl, mime } = await urlToDataUrl(backgroundUrl);
    const fmt = mime.includes('png') ? 'PNG' : 'JPEG';
    // Use FAST compression — the source JPEG is already optimised; re-compressing
    // is unnecessary and slow.
    pdf.addImage(dataUrl, fmt, 0, 0, widthMm, heightMm, undefined, 'FAST');
  }

  // 3. Rasterise overlay (text + QR) at A4-equivalent pixel dimensions.
  // 1600px wide is sharp enough for A1 text overlay and keeps html2canvas fast.
  const overlayBaseW = 1600;
  const overlayBaseH = Math.round((heightMm / widthMm) * overlayBaseW);
  await yieldToBrowser();
  const overlayEl = buildOverlayElement(opts, { w: overlayBaseW, h: overlayBaseH });
  const overlayCanvas = await captureOverlay(overlayEl);
  const overlayDataUrl = overlayCanvas.toDataURL('image/png');
  pdf.addImage(overlayDataUrl, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');

  // 4. Add QR code directly as a vector-quality PNG (skip html2canvas — it can
  // drop data-URL <img> tags, which is why the QR was missing from prints).
  const { qrConfig, qrDataUrl } = opts;
  if (qrConfig?.enabled && qrDataUrl) {
    // Mirror preview EXACTLY: in InteractiveQROverlay the QR is rendered with
    // width = size_percent% of container width and aspect-ratio:1 (square),
    // positioned with left = (x_percent - size_percent/2)% of container WIDTH
    // and top = (y_percent - size_percent/2)% of container HEIGHT.
    // The half-size offset is expressed as a percent of each axis independently
    // (CSS `top: %` is height-relative, `left: %` is width-relative), so we
    // must do the same here — otherwise portrait prints push the QR far below
    // its on-screen position.
    const qrSizeMm = (qrConfig.size_percent / 100) * widthMm; // square: width = height
    const qrXMm = ((qrConfig.x_percent - qrConfig.size_percent / 2) / 100) * widthMm;
    const qrYMm = ((qrConfig.y_percent - qrConfig.size_percent / 2) / 100) * heightMm;
    // Tight white plate (no extra padding) so it stays scannable on busy
    // backgrounds without a visible white border bleeding past the QR edges.
    pdf.setFillColor(255, 255, 255);
    pdf.rect(qrXMm, qrYMm, qrSizeMm, qrSizeMm, 'F');
    pdf.addImage(qrDataUrl, 'PNG', qrXMm, qrYMm, qrSizeMm, qrSizeMm, undefined, 'NONE');
  }

  await savePdfAsync(pdf, fileName);
}
