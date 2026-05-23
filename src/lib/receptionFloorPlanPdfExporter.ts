/**
 * Reception Floor Plan — PDF exporter (Phase 1A · Step 8)
 *
 * Vector rendering with jsPDF (no html2canvas): crisp at any page size,
 * supports A4 / A3 / A2 portrait. Strict parity with the on-screen canvas:
 * room rectangle, grid, fixtures (rect/round, color, label, rotation),
 * tables (circular, chairs around perimeter, name in center, rotation).
 *
 * Filename format: {EventName}-Reception-FloorPlan-{YYYY-MM-DD}.pdf
 */

import jsPDF from 'jspdf';
import type {
  ReceptionFloorPlan,
  TablePosition,
  Fixture,
  ReceptionBackground,
  RoomPolygon,
} from '@/hooks/useReceptionFloorPlan';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import { FIXTURE_BY_TYPE, type FixtureType } from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/fixtures';
import { PDF_DEFAULT_OPTIONS, savePdfAsync } from '@/lib/pdfExportUtils';
import { supabase } from '@/integrations/supabase/client';

const BG_BUCKET = 'reception-floor-plan-backgrounds';

interface LoadedBackground {
  element: HTMLImageElement;
  format: 'PNG' | 'JPEG';
}

const loadBackgroundImage = async (path: string): Promise<LoadedBackground | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(BG_BUCKET)
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return null;
    const resp = await fetch(data.signedUrl);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const format: 'PNG' | 'JPEG' =
      blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : 'PNG';
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('image decode failed'));
      i.src = dataUrl;
    });
    return { element, format };
  } catch {
    return null;
  }
};

export type ReceptionPdfPageSize = 'a4' | 'a3' | 'a2';

export interface ReceptionPdfEvent {
  name: string;
  date: string | null;
  venue: string | null;
  partner1_name: string | null;
  partner2_name: string | null;
  start_time?: string | null;
  finish_time?: string | null;
}

const BRAND_BROWN: [number, number, number] = [150, 122, 89]; // #967A59
const TEXT_DARK: [number, number, number] = [29, 29, 31]; // #1D1D1F
const TEXT_MUTED: [number, number, number] = [110, 110, 115]; // #6E6E73
const GRID: [number, number, number] = [225, 225, 225];

// Page geometry per format (mm). All portrait.
const PAGE_DIMS: Record<ReceptionPdfPageSize, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  a3: { w: 297, h: 420 },
  a2: { w: 420, h: 594 },
};

const MARGIN = 14;
const HEADER_HEIGHT = 34;
const FOOTER_HEIGHT = 10;
const LEGEND_WIDTH = 56; // right-hand sidebar

const NAMED_COLORS: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
};

const hexToRgb = (input: string): [number, number, number] => {
  if (!input) return [0, 0, 0];
  const named = NAMED_COLORS[input.toLowerCase()];
  if (named) return named;
  let m = input.replace('#', '').trim();
  if (m.length === 3) {
    m = m.split('').map((c) => c + c).join('');
  }
  if (m.length !== 6) return [0, 0, 0];
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return [0, 0, 0];
  return [r, g, b];
};

const formatDateLong = (date: string | null): string => {
  if (!date) return 'Date TBD';
  const d = new Date(date + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return 'Date TBD';
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateForFilename = (date: string | null): string => {
  if (date) {
    const d = new Date(date + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const formatTime = (t?: string | null): string | null => {
  if (!t) return null;
  const [hh, mm] = t.split(':');
  const h = parseInt(hh, 10);
  if (Number.isNaN(h)) return null;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${mm} ${ampm}`;
};

const sanitizeFilename = (s: string): string =>
  (s || 'Event')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'Event';

interface RenderContext {
  pdf: jsPDF;
  pageW: number;
  pageH: number;
  roomX: number;
  roomY: number;
  roomW: number;
  roomH: number;
  mmPerM: number;
}

const setRgb = (pdf: jsPDF, fn: 'fill' | 'draw' | 'text', rgb: [number, number, number]) => {
  if (fn === 'fill') pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
  if (fn === 'draw') pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
  if (fn === 'text') pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
};

// -------------------- Header --------------------
const drawHeader = (
  pdf: jsPDF,
  pageW: number,
  event: ReceptionPdfEvent,
  plan: ReceptionFloorPlan,
  tables: ReceptionTable[],
  attendingCount: number
): number => {
  let y = MARGIN;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  setRgb(pdf, 'text', BRAND_BROWN);
  pdf.text(event.name || 'Event', pageW / 2, y + 2, { align: 'center' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  setRgb(pdf, 'text', TEXT_DARK);
  pdf.text('Reception Floor Plan', pageW / 2, y + 2, { align: 'center' });
  y += 6;

  // Couple line
  const couple = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');
  if (couple) {
    pdf.setFontSize(9);
    setRgb(pdf, 'text', TEXT_MUTED);
    pdf.text(couple, pageW / 2, y + 2, { align: 'center' });
    y += 5;
  }

  // Date · Venue · Time
  const dateStr = formatDateLong(event.date);
  const venueStr = event.venue || 'Venue TBD';
  const timeParts = [formatTime(event.start_time), formatTime(event.finish_time)].filter(Boolean);
  const timeStr = timeParts.length === 2 ? `${timeParts[0]} – ${timeParts[1]}` : timeParts[0] || '';
  const meta = [dateStr, venueStr, timeStr].filter(Boolean).join('   ·   ');
  pdf.setFontSize(9);
  setRgb(pdf, 'text', TEXT_DARK);
  pdf.text(meta, pageW / 2, y + 2, { align: 'center' });
  y += 5;

  // Counts line
  const placedTables = plan.table_positions.length;
  const placedSeats = plan.table_positions.reduce((sum, pos) => {
    const t = tables.find((x) => x.id === pos.table_id);
    return sum + (t?.limit_seats || 0);
  }, 0);
  const roomStr = `${plan.room_width_m}m × ${plan.room_length_m}m`;
  const counts = `Room ${roomStr}   ·   Attending ${attendingCount}   ·   Placed seats ${placedSeats}   ·   Tables ${placedTables}/${tables.length}`;
  pdf.setFontSize(8.5);
  setRgb(pdf, 'text', TEXT_MUTED);
  pdf.text(counts, pageW / 2, y + 2, { align: 'center' });
  y += 4;

  // Divider
  setRgb(pdf, 'draw', BRAND_BROWN);
  pdf.setLineWidth(0.4);
  pdf.line(MARGIN, y + 2, pageW - MARGIN, y + 2);
  return y + 2;
};

// -------------------- Footer --------------------
const drawFooter = (pdf: jsPDF, pageW: number, pageH: number) => {
  const y = pageH - 6;
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, y - 4, pageW - MARGIN, y - 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  setRgb(pdf, 'text', TEXT_MUTED);
  pdf.text('Wedding Waitress · Reception Floor Plan', MARGIN, y);
  const exportedOn = `Exported ${new Date().toLocaleDateString('en-AU')} ${new Date().toLocaleTimeString(
    'en-AU',
    { hour: '2-digit', minute: '2-digit' }
  )}`;
  pdf.text(exportedOn, pageW - MARGIN, y, { align: 'right' });
};

// -------------------- Room + grid --------------------
const drawRoomFill = (ctx: RenderContext) => {
  const { pdf, roomX, roomY, roomW, roomH } = ctx;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(roomX, roomY, roomW, roomH, 'F');
};

const drawRoomGrid = (ctx: RenderContext, gridSizeCm: number) => {
  const { pdf, roomX, roomY, roomW, roomH, mmPerM } = ctx;
  setRgb(pdf, 'draw', GRID);
  pdf.setLineWidth(0.1);
  const stepMm = (gridSizeCm / 100) * mmPerM;
  if (stepMm > 0.4) {
    for (let x = stepMm; x < roomW; x += stepMm) {
      pdf.line(roomX + x, roomY, roomX + x, roomY + roomH);
    }
    for (let y = stepMm; y < roomH; y += stepMm) {
      pdf.line(roomX, roomY + y, roomX + roomW, roomY + y);
    }
  }
};

const drawRoomBorder = (ctx: RenderContext, polygon?: RoomPolygon | null) => {
  const { pdf, roomX, roomY, roomW, roomH, mmPerM } = ctx;
  setRgb(pdf, 'draw', TEXT_DARK);
  pdf.setLineWidth(0.6);
  if (polygon && polygon.points.length >= 3) {
    drawPolygonPath(pdf, polygon, roomX, roomY, mmPerM);
    pdf.stroke();
  } else {
    pdf.rect(roomX, roomY, roomW, roomH, 'S');
  }
};

// Build a polygon path on the PDF (no fill/stroke action). Caller decides.
const drawPolygonPath = (
  pdf: jsPDF,
  polygon: RoomPolygon,
  roomX: number,
  roomY: number,
  mmPerM: number
) => {
  const pts = polygon.points;
  const p0 = pts[0];
  // jsPDF lacks a high-level moveTo/lineTo, use pdf.lines with relative deltas
  const lines: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    lines.push([(pts[i].x - pts[i - 1].x) * mmPerM, (pts[i].y - pts[i - 1].y) * mmPerM]);
  }
  // close
  lines.push([(pts[0].x - pts[pts.length - 1].x) * mmPerM, (pts[0].y - pts[pts.length - 1].y) * mmPerM]);
  pdf.lines(lines, roomX + p0.x * mmPerM, roomY + p0.y * mmPerM, [1, 1], null, true);
};

// Clip subsequent drawing to the room polygon (or rectangle when no polygon).
const clipToRoom = (
  pdf: jsPDF,
  ctx: RenderContext,
  polygon: RoomPolygon | null
) => {
  if (polygon && polygon.points.length >= 3) {
    drawPolygonPath(pdf, polygon, ctx.roomX, ctx.roomY, ctx.mmPerM);
  } else {
    pdf.rect(ctx.roomX, ctx.roomY, ctx.roomW, ctx.roomH);
  }
  (pdf as unknown as { clip: () => void; discardPath: () => void }).clip();
  (pdf as unknown as { discardPath: () => void }).discardPath();
};

// -------------------- Background image --------------------
const drawBackground = (
  ctx: RenderContext,
  bg: ReceptionBackground,
  img: LoadedBackground,
  polygon: RoomPolygon | null
) => {
  const { pdf, roomX, roomY, mmPerM } = ctx;
  if (!bg.width || !bg.height) return;

  const wMm = bg.width * mmPerM;
  const hMm = bg.height * mmPerM;
  const xMm = roomX + bg.x * mmPerM;
  const yMm = roomY + bg.y * mmPerM;
  const cxMm = xMm + wMm / 2;
  const cyMm = yMm + hMm / 2;
  const rotation = ((bg.rotation || 0) % 360 + 360) % 360;

  let imageData: string | HTMLImageElement = img.element;
  let format: 'PNG' | 'JPEG' = img.format;
  let renderX = xMm;
  let renderY = yMm;
  let renderW = wMm;
  let renderH = hMm;

  if (rotation !== 0) {
    // Bake rotation onto an offscreen canvas so we can addImage without
    // jsPDF's tricky rotation pivot. Produces a bounding-box PNG.
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const bboxWmm = wMm * cos + hMm * sin;
    const bboxHmm = wMm * sin + hMm * cos;
    const pxPerMm = 150 / 25.4; // ~150 DPI
    const cw = Math.max(1, Math.round(bboxWmm * pxPerMm));
    const ch = Math.max(1, Math.round(bboxHmm * pxPerMm));
    const cnv = document.createElement('canvas');
    cnv.width = cw;
    cnv.height = ch;
    const c = cnv.getContext('2d');
    if (!c) return;
    c.translate(cw / 2, ch / 2);
    c.rotate((rotation * Math.PI) / 180);
    const imgWpx = wMm * pxPerMm;
    const imgHpx = hMm * pxPerMm;
    c.drawImage(img.element, -imgWpx / 2, -imgHpx / 2, imgWpx, imgHpx);
    imageData = cnv.toDataURL('image/png');
    format = 'PNG';
    renderX = cxMm - bboxWmm / 2;
    renderY = cyMm - bboxHmm / 2;
    renderW = bboxWmm;
    renderH = bboxHmm;
  }

  const opacity = Math.max(0.05, Math.min(1, bg.opacity ?? 1));

  pdf.saveGraphicsState();
  try {
    const GStateCtor = (pdf as unknown as { GState: new (o: { opacity: number }) => unknown }).GState;
    if (GStateCtor) {
      const gs = new GStateCtor({ opacity });
      (pdf as unknown as { setGState: (gs: unknown) => void }).setGState(gs);
    }
    // Clip to the room polygon (or rectangle) so any overflow is hidden.
    clipToRoom(pdf, ctx, polygon);
    pdf.addImage(imageData as string, format, renderX, renderY, renderW, renderH, undefined, 'FAST');
  } catch (err) {
    console.warn('[receptionFloorPlanPdfExporter] background draw failed', err);
  } finally {
    pdf.restoreGraphicsState();
  }
};

// Rotate a point (xMm, yMm) around (cxMm, cyMm) by angle degrees.
const rotate = (xMm: number, yMm: number, cxMm: number, cyMm: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  const dx = xMm - cxMm;
  const dy = yMm - cyMm;
  return {
    x: cxMm + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cyMm + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
};

// -------------------- Fixtures --------------------
const drawFixtures = (ctx: RenderContext, fixtures: Fixture[]) => {
  const { pdf, roomX, roomY, mmPerM } = ctx;
  fixtures.forEach((fx) => {
    const spec = FIXTURE_BY_TYPE[fx.type];
    if (!spec) return;
    const cxMm = roomX + fx.x * mmPerM;
    const cyMm = roomY + fx.y * mmPerM;
    const wMm = fx.width_m * mmPerM;
    const hMm = fx.height_m * mmPerM;
    const fill = hexToRgb(spec.color);
    const text = hexToRgb(spec.textColor);

    setRgb(pdf, 'fill', fill);
    setRgb(pdf, 'draw', [0, 0, 0]);
    pdf.setLineWidth(0.2);

    if (spec.shape === 'round') {
      pdf.ellipse(cxMm, cyMm, wMm / 2, hMm / 2, 'FD');
    } else if (fx.rotation % 360 === 0) {
      pdf.rect(cxMm - wMm / 2, cyMm - hMm / 2, wMm, hMm, 'FD');
    } else {
      // Rotated rectangle as a polygon
      const corners = [
        rotate(cxMm - wMm / 2, cyMm - hMm / 2, cxMm, cyMm, fx.rotation),
        rotate(cxMm + wMm / 2, cyMm - hMm / 2, cxMm, cyMm, fx.rotation),
        rotate(cxMm + wMm / 2, cyMm + hMm / 2, cxMm, cyMm, fx.rotation),
        rotate(cxMm - wMm / 2, cyMm + hMm / 2, cxMm, cyMm, fx.rotation),
      ];
      const lines: [number, number][] = [];
      for (let i = 1; i < corners.length; i++) {
        lines.push([corners[i].x - corners[i - 1].x, corners[i].y - corners[i - 1].y]);
      }
      lines.push([corners[0].x - corners[3].x, corners[0].y - corners[3].y]);
      pdf.lines(lines, corners[0].x, corners[0].y, [1, 1], 'FD', true);
    }

    // Label
    const label = (fx.label || spec.label).slice(0, 18);
    const fontSize = Math.max(5, Math.min(8, Math.min(wMm, hMm) * 0.45));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(fontSize);
    setRgb(pdf, 'text', text);
    pdf.text(label, cxMm, cyMm + fontSize / 3.2, { align: 'center' });
  });
};

// -------------------- Tables + chairs --------------------
const drawTables = (
  ctx: RenderContext,
  positions: TablePosition[],
  tables: ReceptionTable[]
) => {
  const { pdf, roomX, roomY, mmPerM } = ctx;
  const tableById = new Map<string, ReceptionTable>();
  tables.forEach((t) => tableById.set(t.id, t));

  positions.forEach((pos) => {
    const t = tableById.get(pos.table_id);
    if (!t) return;
    const cxMm = roomX + pos.x * mmPerM;
    const cyMm = roomY + pos.y * mmPerM;
    // Diameter mirrors on-screen logic (1.2m base + 0.12m/extra seat) capped.
    const diameterM = Math.max(1.2, 1.2 + Math.max(0, t.limit_seats - 6) * 0.12);
    const diameterMm = diameterM * mmPerM;
    const chairOffsetMm = diameterMm / 2 + Math.max(1.6, mmPerM * 0.15);
    const chairSizeMm = Math.max(1.8, mmPerM * 0.18);

    // Chairs around perimeter
    setRgb(pdf, 'fill', [171, 138, 100]); // brown 70%
    setRgb(pdf, 'draw', [122, 99, 71]);
    pdf.setLineWidth(0.1);
    const n = Math.max(1, t.limit_seats);
    for (let i = 0; i < n; i++) {
      const baseAngle = (i / n) * 360 - 90; // start at top
      const angle = baseAngle + pos.rotation;
      const rad = (angle * Math.PI) / 180;
      const ccx = cxMm + Math.cos(rad) * chairOffsetMm;
      const ccy = cyMm + Math.sin(rad) * chairOffsetMm;
      pdf.rect(ccx - chairSizeMm / 2, ccy - chairSizeMm / 2, chairSizeMm, chairSizeMm, 'FD');
    }

    // Table disc
    setRgb(pdf, 'fill', BRAND_BROWN);
    setRgb(pdf, 'draw', [122, 99, 71]);
    pdf.setLineWidth(0.3);
    pdf.circle(cxMm, cyMm, diameterMm / 2, 'FD');

    // Label
    const label = t.name || `T${t.table_no}`;
    const fontSize = Math.max(5.5, Math.min(10, diameterMm * 0.22));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(fontSize);
    setRgb(pdf, 'text', [255, 255, 255]);
    pdf.text(label.slice(0, 14), cxMm, cyMm + fontSize / 3.2, { align: 'center' });
  });
};

// -------------------- Legend --------------------
const drawLegend = (
  pdf: jsPDF,
  pageW: number,
  contentTop: number,
  contentBottom: number,
  fixtures: Fixture[],
  tables: ReceptionTable[],
  positions: TablePosition[]
) => {
  const x = pageW - MARGIN - LEGEND_WIDTH;
  const y = contentTop;
  const w = LEGEND_WIDTH;

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  setRgb(pdf, 'text', BRAND_BROWN);
  pdf.text('Legend', x, y + 4);

  let cursorY = y + 9;

  // Tables row
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  setRgb(pdf, 'text', TEXT_DARK);
  pdf.text('Tables', x, cursorY);
  cursorY += 3.5;

  // Mini table swatch
  setRgb(pdf, 'fill', BRAND_BROWN);
  setRgb(pdf, 'draw', [122, 99, 71]);
  pdf.setLineWidth(0.2);
  pdf.circle(x + 3, cursorY + 1, 2.2, 'FD');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  setRgb(pdf, 'text', TEXT_MUTED);
  const placedSeats = positions.reduce((sum, p) => {
    const t = tables.find((x) => x.id === p.table_id);
    return sum + (t?.limit_seats || 0);
  }, 0);
  pdf.text(`Guest tables · ${positions.length} placed · ${placedSeats} seats`, x + 7, cursorY + 2);
  cursorY += 7;

  // Fixtures heading
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  setRgb(pdf, 'text', TEXT_DARK);
  pdf.text('Fixtures', x, cursorY);
  cursorY += 3.5;

  // Group fixtures by type with counts
  const counts = new Map<FixtureType, number>();
  fixtures.forEach((fx) => counts.set(fx.type, (counts.get(fx.type) || 0) + 1));

  if (counts.size === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    setRgb(pdf, 'text', TEXT_MUTED);
    pdf.text('No fixtures placed.', x, cursorY + 2);
    return;
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  const swatch = 3.4;
  const rowH = 4.8;
  counts.forEach((count, type) => {
    if (cursorY + rowH > contentBottom) return;
    const spec = FIXTURE_BY_TYPE[type];
    if (!spec) return;
    const fill = hexToRgb(spec.color);
    setRgb(pdf, 'fill', fill);
    setRgb(pdf, 'draw', [0, 0, 0]);
    pdf.setLineWidth(0.15);
    if (spec.shape === 'round') {
      pdf.ellipse(x + swatch / 2 + 0.2, cursorY + swatch / 2 - 0.2, swatch / 2, swatch / 2, 'FD');
    } else {
      pdf.rect(x, cursorY - swatch + 0.3, swatch + 1, swatch, 'FD');
    }
    setRgb(pdf, 'text', TEXT_DARK);
    pdf.text(`${spec.label} × ${count}`, x + swatch + 3, cursorY + 1.2);
    cursorY += rowH;
  });

  // Bounding box around legend
  setRgb(pdf, 'draw', [220, 220, 220]);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x - 3, y - 1, w + 6, Math.min(contentBottom, cursorY + 3) - (y - 1), 1.5, 1.5);
};

// -------------------- Main entry --------------------
export const generateReceptionFloorPlanPDF = async (
  plan: ReceptionFloorPlan,
  tables: ReceptionTable[],
  event: ReceptionPdfEvent,
  attendingCount: number,
  pageSize: ReceptionPdfPageSize = 'a4'
): Promise<void> => {
  const { w: pageW, h: pageH } = PAGE_DIMS[pageSize];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pageSize,
    ...PDF_DEFAULT_OPTIONS,
  });

  // Header
  const headerBottom = drawHeader(pdf, pageW, event, plan, tables, attendingCount);
  const contentTop = headerBottom + 6;
  const contentBottom = pageH - FOOTER_HEIGHT - 2;

  // Compute room render box that fits content area minus legend
  const availW = pageW - MARGIN * 2 - LEGEND_WIDTH - 6;
  const availH = contentBottom - contentTop;
  const aspect = plan.room_width_m / plan.room_length_m;
  let roomW = availW;
  let roomH = roomW / aspect;
  if (roomH > availH) {
    roomH = availH;
    roomW = roomH * aspect;
  }
  const mmPerM = roomW / plan.room_width_m;
  const roomX = MARGIN;
  const roomY = contentTop + (availH - roomH) / 2;

  const ctx: RenderContext = { pdf, pageW, pageH, roomX, roomY, roomW, roomH, mmPerM };

  // Pre-load venue background image (silent fallback if anything fails).
  let bgImage: LoadedBackground | null = null;
  if (
    plan.background?.path &&
    plan.background.visible &&
    plan.background.width &&
    plan.background.height
  ) {
    bgImage = await loadBackgroundImage(plan.background.path);
  }

  drawRoomFill(ctx);
  if (bgImage) drawBackground(ctx, plan.background, bgImage, plan.room_polygon);
  drawRoomGrid(ctx, plan.grid_size_cm);
  drawFixtures(ctx, plan.fixtures);
  drawTables(ctx, plan.table_positions, tables);
  drawRoomBorder(ctx, plan.room_polygon);

  // Room caption under the room
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7.5);
  setRgb(pdf, 'text', TEXT_MUTED);
  pdf.text(
    `Room ${plan.room_width_m}m × ${plan.room_length_m}m · grid ${plan.grid_size_cm}cm · scale ${mmPerM.toFixed(1)}mm/m`,
    roomX,
    Math.min(roomY + roomH + 4, contentBottom - 1)
  );

  drawLegend(pdf, pageW, contentTop, contentBottom, plan.fixtures, tables, plan.table_positions);
  drawFooter(pdf, pageW, pageH);

  const filename = `${sanitizeFilename(event.name)}-Reception-FloorPlan-${formatDateForFilename(
    event.date
  )}.pdf`;
  await savePdfAsync(pdf, filename);
};
