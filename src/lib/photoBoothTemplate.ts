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
export const PB_STRIP_PRINT = { w: 1440, h: 2000 };   // full two-strip print canvas
export const PB_STRIP_SINGLE = { w: 720, h: 2000 };   // one half of the print canvas
export const PB_STRIP_COUNT = 4;

/**
 * Footer panel geometry — the SINGLE source of truth shared by the renderer,
 * the live preview, upload validation, the blank template download and tests.
 * Derived directly from the strip renderer: one column is PB_STRIP_SINGLE.w
 * wide and the footer band is round(canvasHeight * 0.108) tall.
 */
export const PB_STRIP_FOOTER_RATIO = 0.108;
export const FOOTER_PANEL_WIDTH = PB_STRIP_SINGLE.w;                                  // 720
export const FOOTER_PANEL_HEIGHT = Math.round(PB_STRIP_PRINT.h * PB_STRIP_FOOTER_RATIO); // 216
/** Recommended safe area inset (px) for text/logos inside the footer panel. */
export const FOOTER_PANEL_SAFE_INSET = 24;

/** Physical size of the footer panel at 300 DPI, in millimetres. */
export const footerPanelMm = () => ({
  w: Math.round((FOOTER_PANEL_WIDTH / 300) * 25.4 * 10) / 10,
  h: Math.round((FOOTER_PANEL_HEIGHT / 300) * 25.4 * 10) / 10,
});

export interface FooterPanelValidation {
  ok: boolean;
  width: number;
  height: number;
  message?: string;
}

/** Strict dimension check for an uploaded custom footer design. */
export function validateFooterPanelSize(width: number, height: number): FooterPanelValidation {
  if (width === FOOTER_PANEL_WIDTH && height === FOOTER_PANEL_HEIGHT) {
    return { ok: true, width, height };
  }
  return {
    ok: false,
    width,
    height,
    message: `This image is ${width} × ${height} px. Your footer design must be exactly ${FOOTER_PANEL_WIDTH} × ${FOOTER_PANEL_HEIGHT} px. Please resize it or use the blank footer template.`,
  };
}

/** Builds a transparent PNG blank footer template with a removable safe-area guide. */
export function makeBlankFooterTemplate(withGuide = true): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FOOTER_PANEL_WIDTH;
  c.height = FOOTER_PANEL_HEIGHT;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  if (withGuide) {
    ctx.save();
    ctx.strokeStyle = 'rgba(150,122,89,0.55)';
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(
      FOOTER_PANEL_SAFE_INSET, FOOTER_PANEL_SAFE_INSET,
      c.width - FOOTER_PANEL_SAFE_INSET * 2, c.height - FOOTER_PANEL_SAFE_INSET * 2,
    );
    ctx.restore();
  }
  return c;
}


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

/** Host-customisable photo strip styling (persisted per event). */
export interface PhotoBoothStripStyle {
  /** Background colour of the whole strip (ignored when template artwork is uploaded) */
  bgColor?: string | null;
  /** Legacy shared font family / colour — kept as backward-compatible defaults */
  fontFamily?: string | null;
  fontColor?: string | null;
  nameSize?: number | null;
  dateSize?: number | null;
  /** Header (event name / first custom line) */
  nameFontFamily?: string | null;
  nameColor?: string | null;
  /** Date (event date / subsequent custom lines) */
  dateFontFamily?: string | null;
  dateColor?: string | null;
}

export const PB_DEFAULT_STYLE: Required<PhotoBoothStripStyle> = {
  bgColor: PB_BROWN,
  fontFamily: 'Inter',
  fontColor: '#FFFFFF',
  nameSize: 42,
  dateSize: 30,
  nameFontFamily: 'Inter',
  nameColor: '#FFFFFF',
  dateFontFamily: 'Inter',
  dateColor: '#FFFFFF',
};

export const resolveStripStyle = (s?: PhotoBoothStripStyle | null): Required<PhotoBoothStripStyle> => {
  const family = s?.fontFamily || PB_DEFAULT_STYLE.fontFamily;
  const color = s?.fontColor || PB_DEFAULT_STYLE.fontColor;
  return {
    bgColor: s?.bgColor || PB_DEFAULT_STYLE.bgColor,
    fontFamily: family,
    fontColor: color,
    nameSize: s?.nameSize || PB_DEFAULT_STYLE.nameSize,
    dateSize: s?.dateSize || PB_DEFAULT_STYLE.dateSize,
    nameFontFamily: s?.nameFontFamily || family,
    nameColor: s?.nameColor || color,
    dateFontFamily: s?.dateFontFamily || family,
    dateColor: s?.dateColor || color,
  };
};

/** Wraps a font-family name for canvas usage. */
export const cssFont = (family?: string | null) =>
  `"${(family || 'Inter').replace(/"/g, '')}", "Inter", system-ui, sans-serif`;

/** Picks white or near-black text for readability on a given background colour. */
export const contrastInk = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.65 ? '#1D1D1F' : '#FFFFFF';
};

/** Website label printed across the top of each photo strip column. */
export const PB_SITE_LABEL = 'wedding waitress.com.au';
export const PB_INK_DARK = '#0B0B0B';
export const PB_INK_LIGHT = '#FFFFFF';

/** WCAG relative luminance of an sRGB colour. */
export const relativeLuminance = (r: number, g: number, b: number): number => {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Chooses black or white — whichever gives the strongest WCAG contrast. */
export const inkForLuminance = (L: number): string => {
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastBlack >= contrastWhite ? PB_INK_DARK : PB_INK_LIGHT;
};

/** Auto text colour for a solid hex background. */
export const autoInkForHex = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return PB_INK_LIGHT;
  const n = parseInt(m[1], 16);
  return inkForLuminance(relativeLuminance((n >> 16) & 255, (n >> 8) & 255, n & 255));
};

/** Auto text colour by sampling the already-drawn canvas region behind the label. */
export const autoInkForRegion = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fallback = PB_INK_LIGHT,
): string => {
  try {
    const data = ctx.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))).data;
    let total = 0, count = 0;
    const step = 4 * 4; // sample every 4th pixel
    for (let i = 0; i < data.length; i += step) {
      total += relativeLuminance(data[i], data[i + 1], data[i + 2]);
      count++;
    }
    if (!count) return fallback;
    return inkForLuminance(total / count);
  } catch {
    return fallback;
  }
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
  /** Photo strip styling (colours, fonts) */
  style?: PhotoBoothStripStyle | null;
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
 * Photo strip composer — renders ONE complete 1440 × 2000 canvas.
 *
 * The background (solid colour, library template or custom uploaded JPEG) is
 * drawn exactly once across the whole canvas at 0,0,1440,2000. The eight photo
 * positions (4 left + 4 right) and the footer content are then drawn on top of
 * that single continuous background. The background is never repeated, tiled,
 * mirrored or split per strip.
 */
export async function composeStrip(photos: PhotoSource[], opts: ComposeOpts): Promise<HTMLCanvasElement> {
  const style = resolveStripStyle(opts.style);
  const { w: W, h: H } = PB_STRIP_PRINT;
  const HALF = PB_STRIP_SINGLE.w;

  const padding = 22;
  const gap = 16;
  const headerH = 68;                        // WEDDINGWAITRESS.COM.AU band
  const footerH = FOOTER_PANEL_HEIGHT;       // footer under the photos (shared constant)
  const photoAreaTop = headerH;
  const photoAreaH = H - headerH - footerH;
  const photoW = HALF - padding * 2;
  const photoH = Math.round((photoAreaH - padding - gap * (PB_STRIP_COUNT - 1)) / PB_STRIP_COUNT);

  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  let templateImg: HTMLImageElement | null = null;
  if (opts.templateUrl) {
    try { templateImg = await loadImageEl(opts.templateUrl); } catch { templateImg = null; }
  }

  // Custom footer design (one complete footer panel, duplicated under both columns)
  let footerPanelImg: HTMLImageElement | null = null;
  if (opts.logoUrl) {
    try { footerPanelImg = await loadImageEl(opts.logoUrl); } catch { footerPanelImg = null; }
  }


  // ── Single, continuous background across the entire canvas ────────────────
  if (templateImg) {
    drawCover(ctx, templateImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = style.bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  // Resolve the photos once and reuse them for both halves.
  const resolved: (HTMLImageElement | HTMLCanvasElement | null)[] = [];
  for (let i = 0; i < PB_STRIP_COUNT; i++) {
    const src = photos[i] ?? photos[photos.length - 1];
    resolved.push(src ? await resolveSource(src) : null);
  }

  // ── Foreground content, drawn per half over the shared background ─────────
  for (let half = 0; half < 2; half++) {
    const offX = half * HALF;

    {
      // Website label — colour auto-adapts to the background right behind it.
      const labelInk = templateImg
        ? autoInkForRegion(ctx, offX + HALF * 0.1, 6, HALF * 0.8, headerH - 12, autoInkForHex(style.bgColor))
        : autoInkForHex(style.bgColor);
      ctx.fillStyle = labelInk;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 34px ${cssFont(style.fontFamily)}`;
      ctx.fillText(PB_SITE_LABEL, offX + HALF / 2, headerH / 2 + 4);
    }


    for (let i = 0; i < PB_STRIP_COUNT; i++) {
      const img = resolved[i];
      if (!img) continue;
      drawCover(ctx, img, offX + padding, photoAreaTop + i * (photoH + gap), photoW, photoH);
    }

    // ── Custom footer design overrides ALL footer text ────────────────────
    if (footerPanelImg) {
      ctx.drawImage(footerPanelImg, offX, H - footerH, HALF, footerH);
      continue;
    }

    if (templateImg) {
      await drawBrandingStrip(ctx, {
        x: offX, y: H - footerH, width: HALF, height: footerH,
        opts, hasTemplate: true, scale: 0.92,
      });
      continue;
    }

    // Footer with the event name / date (or custom footer text)
    const fy = H - footerH;
    const logoH = 0;


    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const custom = (opts.bottomText || '').replace(/\r/g, '');
    const hasCustom = !!custom.trim();
    const nameSize = style.nameSize;
    const dateSize = style.dateSize;
    const nameFont = cssFont(style.nameFontFamily);
    const dateFont = cssFont(style.dateFontFamily);

    ctx.font = `700 ${nameSize}px ${nameFont}`;
    const customLines = hasCustom ? custom.split('\n').map(l => l.trim()).filter(Boolean) : [];
    const headLines: string[] = hasCustom
      ? wrapLines(ctx, customLines[0] || ' ', HALF - 56).slice(0, 2)
      : wrapLines(ctx, (opts.title || '').trim() || PB_PLACEHOLDER_TEXT, HALF - 56).slice(0, 2);

    ctx.font = `500 ${dateSize}px ${dateFont}`;
    const subLines: string[] = hasCustom
      ? customLines.slice(1).flatMap(l => wrapLines(ctx, l, HALF - 56)).slice(0, 2)
      : [(opts.dateText || '').trim()].filter(Boolean);

    const lineH = Math.round(nameSize * 1.2);
    const subH = Math.round(dateSize * 1.26);
    const areaTop = fy + logoH;
    const areaH = footerH - logoH;
    let cursor = areaTop + areaH / 2 - (headLines.length * lineH + subLines.length * subH) / 2 + lineH / 2;

    ctx.fillStyle = style.nameColor;
    ctx.font = `700 ${nameSize}px ${nameFont}`;
    for (const ln of headLines) { ctx.fillText(ln, offX + HALF / 2, cursor); cursor += lineH; }

    if (subLines.length) {
      ctx.fillStyle = style.dateColor;
      ctx.font = `500 ${dateSize}px ${dateFont}`;
      cursor += 4;
      for (const ln of subLines) { ctx.fillText(ln, offX + HALF / 2, cursor); cursor += subH; }
    }
  }

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
