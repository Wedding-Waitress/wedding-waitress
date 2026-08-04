// Photo Booth template rendering — shared by the guest Photo Booth page and the
// dashboard live preview so both always look identical.
//
// Defaults (used when the host has NOT uploaded custom template artwork):
//  - Clean cream/white background
//  - Bottom branding strip (~15% height) in soft rose/gold (#C8A97E)
//  - Couple/event name + event date (or "Your Names • Your Date" placeholder)
//  - Very subtle grey "Wedding Waitress" credit, bottom-right
//  - Single portrait 1080×1800, single landscape 1800×1080, strip print 1200×1800 (4×6)

export const PB_CREAM = '#FBF7F0';
export const PB_BROWN = '#967A59';
export const PB_GOLD = '#C8A97E';
export const PB_GOLD_DARK = '#B08F63';
export const PB_INK = '#FFFFFF';
export const PB_CREDIT = '#8C8C8C';

export const PB_SINGLE_PORTRAIT = { w: 1080, h: 1800 };
export const PB_SINGLE_LANDSCAPE = { w: 1800, h: 1080 };
export const PB_STRIP_PRINT = { w: 1200, h: 1960 };   // slightly taller print sheet
export const PB_STRIP_SINGLE = { w: 600, h: 1960 };   // taller vertical strip (same width)
export const PB_STRIP_COUNT = 4;

export const PB_PLACEHOLDER_TEXT = 'Your Names • Your Date';

/** Default bottom text for an event: "Names • Date", falling back to the placeholder. */
export function defaultBottomText(title?: string | null, dateText?: string | null): string {
  const parts = [title?.trim(), dateText?.trim()].filter(Boolean) as string[];
  if (!parts.length) return PB_PLACEHOLDER_TEXT;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} • ${parts[1]}`;
}

export function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export const loadImageEl = (src: string, crossOrigin = true) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = (e) => rej(e);
    img.src = src;
  });

const loadBlobImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });

export type PhotoSource = Blob | HTMLImageElement | HTMLCanvasElement;

const resolveSource = async (src: PhotoSource): Promise<HTMLImageElement | HTMLCanvasElement> =>
  src instanceof Blob ? await loadBlobImage(src) : src;

export const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  dx: number, dy: number, dw: number, dh: number,
) => {
  const iw = (img as HTMLImageElement).naturalWidth || img.width;
  const ih = (img as HTMLImageElement).naturalHeight || img.height;
  if (!iw || !ih) return;
  const ir = iw / ih;
  const tr = dw / dh;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (ir > tr) { sw = ih * tr; sx = (iw - sw) / 2; }
  else { sh = iw / tr; sy = (ih - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
};

const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else { line = test; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
};

export interface ComposeOpts {
  /** Couple / event name */
  title: string;
  /** Pre-formatted event date */
  dateText: string;
  hashtag?: string;
  /** Host custom bottom text; when empty the default name + date is used */
  bottomText: string | null;
  logoUrl: string | null;
  /** Host uploaded JPEG artwork; when set it replaces the default background + strip */
  templateUrl: string | null;
  showBranding: boolean;
}

/** Draws the default rose/gold branding strip with text + optional logo. */
async function drawBrandingStrip(ctx: CanvasRenderingContext2D, opts: {
  x: number; y: number; width: number; height: number;
  opts: ComposeOpts;
  hasTemplate: boolean;
  scale: number;
}) {
  const { x, y, width, height, hasTemplate, scale } = opts;
  const o = opts.opts;
  const cx = x + width / 2;

  if (!hasTemplate) {
    ctx.fillStyle = PB_GOLD;
    ctx.fillRect(x, y, width, height);
    // subtle top hairline for a printed feel
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, width, Math.max(1, 2 * scale));
  }

  const textColor = hasTemplate ? '#1D1D1F' : PB_INK;
  const subColor = hasTemplate ? '#6E6E73' : 'rgba(255,255,255,0.85)';

  // Optional logo (top of the strip)
  let logoH = 0;
  if (o.logoUrl) {
    try {
      const logoImg = await loadImageEl(o.logoUrl);
      const maxH = Math.min(height * 0.34, 90 * scale);
      const ratio = (logoImg.naturalWidth || logoImg.width) / (logoImg.naturalHeight || logoImg.height);
      const lh = maxH;
      const lw = Math.min(lh * ratio, width - 60 * scale);
      ctx.drawImage(logoImg, cx - lw / 2, y + 18 * scale, lw, lh);
      logoH = lh + 14 * scale;
    } catch { /* ignore logo failures */ }
  }

  const main = (o.bottomText && o.bottomText.trim()) || defaultBottomText(o.title, o.dateText);
  const hashtag = o.hashtag ? (o.hashtag.startsWith('#') ? o.hashtag : `#${o.hashtag}`) : '';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const mainSize = Math.round(38 * scale);
  ctx.font = `600 ${mainSize}px "Inter", system-ui, sans-serif`;
  const lines = wrapLines(ctx, main, width - 70 * scale);
  const lineH = Math.round(mainSize * 1.24);
  const hashSize = Math.round(22 * scale);
  const blockH = lines.length * lineH + (hashtag ? hashSize * 1.6 : 0);

  const areaTop = y + logoH;
  const areaH = height - logoH - 26 * scale;
  let cursor = areaTop + areaH / 2 - blockH / 2 + lineH / 2;

  ctx.fillStyle = textColor;
  for (const ln of lines) {
    ctx.fillText(ln, cx, cursor);
    cursor += lineH;
  }

  if (hashtag) {
    ctx.fillStyle = subColor;
    ctx.font = `500 ${hashSize}px "Inter", system-ui, sans-serif`;
    ctx.fillText(hashtag, cx, cursor + hashSize * 0.3);
  }

  if (o.showBranding) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = hasTemplate ? PB_CREDIT : 'rgba(255,255,255,0.6)';
    ctx.font = `400 ${Math.round(15 * scale)}px "Inter", system-ui, sans-serif`;
    ctx.fillText('Wedding Waitress', x + width - 20 * scale, y + height - 14 * scale);
  }
}

/** Single photo composer — keeps captured orientation (portrait or landscape). */
export async function composeSingle(photo: PhotoSource, opts: ComposeOpts): Promise<HTMLCanvasElement> {
  const photoImg = await resolveSource(photo);
  const iw = (photoImg as HTMLImageElement).naturalWidth || photoImg.width;
  const ih = (photoImg as HTMLImageElement).naturalHeight || photoImg.height;
  const portrait = ih >= iw;
  const { w: W, h: H } = portrait ? PB_SINGLE_PORTRAIT : PB_SINGLE_LANDSCAPE;
  const stripH = Math.round(H * 0.15);
  const pad = Math.round(W * 0.028);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  let templateImg: HTMLImageElement | null = null;
  if (opts.templateUrl) {
    try { templateImg = await loadImageEl(opts.templateUrl); } catch { templateImg = null; }
  }

  if (templateImg) {
    drawCover(ctx, templateImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = PB_CREAM;
    ctx.fillRect(0, 0, W, H);
  }

  const slotX = pad, slotY = pad, slotW = W - pad * 2, slotH = H - stripH - pad * 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(slotX - 5, slotY - 5, slotW + 10, slotH + 10);
  drawCover(ctx, photoImg, slotX, slotY, slotW, slotH);
  ctx.strokeStyle = 'rgba(200,169,126,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(slotX, slotY, slotW, slotH);

  await drawBrandingStrip(ctx, {
    x: 0, y: H - stripH, width: W, height: stripH,
    opts, hasTemplate: !!templateImg, scale: portrait ? 1.15 : 1,
  });

  return canvas;
}

/**
 * Photo strip composer — builds ONE vertical 2×6 strip on the Wedding Waitress
 * brand brown background, then renders it TWICE side-by-side on the 4×6 print
 * canvas so both halves are exact duplicates.
 */
export async function composeStrip(photos: PhotoSource[], opts: ComposeOpts): Promise<HTMLCanvasElement> {
  const { w: STRIP_W, h: STRIP_H } = PB_STRIP_SINGLE;
  const padding = 18;
  const gap = 14;
  const headerH = 62;                              // WEDDINGWAITRESS.COM.AU band
  const footerH = Math.round(STRIP_H * 0.108);     // tighter footer under the photos
  const photoAreaTop = headerH;
  const photoAreaH = STRIP_H - headerH - footerH;
  const photoW = STRIP_W - padding * 2;
  const photoH = Math.round((photoAreaH - padding - gap * (PB_STRIP_COUNT - 1)) / PB_STRIP_COUNT);

  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = STRIP_W; stripCanvas.height = STRIP_H;
  const sctx = stripCanvas.getContext('2d');
  if (!sctx) throw new Error('Canvas not available');

  let templateImg: HTMLImageElement | null = null;
  if (opts.templateUrl) {
    try { templateImg = await loadImageEl(opts.templateUrl); } catch { templateImg = null; }
  }

  if (templateImg) {
    // The print artwork is landscape (two strips) — use its LEFT half per strip.
    const iw = templateImg.naturalWidth || templateImg.width;
    const ih = templateImg.naturalHeight || templateImg.height;
    const halfW = iw / 2;
    const ir = halfW / ih;
    const tr = STRIP_W / STRIP_H;
    let sx = 0, sy = 0, sw = halfW, sh = ih;
    if (ir > tr) { sw = ih * tr; sx = (halfW - sw) / 2; }
    else { sh = halfW / tr; sy = (ih - sh) / 2; }
    sctx.drawImage(templateImg, sx, sy, sw, sh, 0, 0, STRIP_W, STRIP_H);
  } else {
    // Solid Wedding Waitress brown across the whole strip (background, borders,
    // gaps, header and footer all share this colour).
    sctx.fillStyle = PB_BROWN;
    sctx.fillRect(0, 0, STRIP_W, STRIP_H);

    // Compact white site brand at the top of every strip
    sctx.fillStyle = '#FFFFFF';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.font = '600 27px "Inter", system-ui, sans-serif';
    sctx.fillText('WEDDINGWAITRESS.COM.AU', STRIP_W / 2, headerH / 2 + 4);
  }

  for (let i = 0; i < PB_STRIP_COUNT; i++) {
    const src = photos[i] ?? photos[photos.length - 1];
    if (!src) continue;
    const img = await resolveSource(src);
    const x = padding;
    const y = photoAreaTop + i * (photoH + gap);
    drawCover(sctx, img, x, y, photoW, photoH);
  }

  if (templateImg) {
    await drawBrandingStrip(sctx, {
      x: 0, y: STRIP_H - footerH, width: STRIP_W, height: footerH,
      opts, hasTemplate: true, scale: 0.92,
    });
  } else {
    // Brown footer with white event name + date
    const fy = STRIP_H - footerH;
    sctx.fillStyle = PB_BROWN;
    sctx.fillRect(0, fy, STRIP_W, footerH);
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillStyle = '#FFFFFF';

    const title = (opts.bottomText && opts.bottomText.trim()) || (opts.title || '').trim();
    const dateText = (opts.dateText || '').trim();
    sctx.font = '700 42px "Inter", system-ui, sans-serif';
    const lines = wrapLines(sctx, title || PB_PLACEHOLDER_TEXT, STRIP_W - 48).slice(0, 2);
    const lineH = 50;
    const dateH = dateText ? 38 : 0;
    let cursor = fy + footerH / 2 - (lines.length * lineH + dateH) / 2 + lineH / 2;
    for (const ln of lines) { sctx.fillText(ln, STRIP_W / 2, cursor); cursor += lineH; }
    if (dateText) {
      sctx.font = '500 30px "Inter", system-ui, sans-serif';
      sctx.fillStyle = 'rgba(255,255,255,0.9)';
      sctx.fillText(dateText, STRIP_W / 2, cursor + 4);
    }
  }

  const out = document.createElement('canvas');
  out.width = PB_STRIP_PRINT.w; out.height = PB_STRIP_PRINT.h;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas not available');
  octx.fillStyle = templateImg ? '#FFFFFF' : PB_BROWN;
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(stripCanvas, 0, 0);
  octx.drawImage(stripCanvas, STRIP_W, 0);

  return out;
}


export const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> =>
  new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not render image'))), 'image/jpeg', quality));

export async function composeSingleBlob(photo: PhotoSource, opts: ComposeOpts): Promise<Blob> {
  return canvasToJpegBlob(await composeSingle(photo, opts));
}

export async function composeStripBlob(photos: PhotoSource[], opts: ComposeOpts): Promise<Blob> {
  return canvasToJpegBlob(await composeStrip(photos, opts));
}

/** Placeholder photo used for dashboard live previews. */
export function makePlaceholderPhoto(index: number, portrait = true): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = portrait ? 900 : 1200;
  c.height = portrait ? 1200 : 900;
  const ctx = c.getContext('2d')!;
  const tones = [
    ['#EDE3D6', '#D8C6AE'],
    ['#E6E9EC', '#C9D2DA'],
    ['#F0E5E5', '#DCC4C4'],
  ][index % 3];
  const g = ctx.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, tones[0]);
  g.addColorStop(1, tones[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(c.width * 0.5, c.height * 0.42, Math.min(c.width, c.height) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(29,29,31,0.35)';
  ctx.textAlign = 'center';
  ctx.font = `500 ${Math.round(c.width * 0.055)}px "Inter", system-ui, sans-serif`;
  ctx.fillText('Guest photo', c.width / 2, c.height * 0.72);
  return c;
}
