/**
 * ============================================================================
 * FULL SEATING CHART — SHARED A4 LAYOUT CONSTANTS
 * ============================================================================
 * 
 * Single source of truth for all layout dimensions used by:
 *   - FullSeatingChartPreview.tsx (screen preview)
 *   - fullSeatingChartPdfExporter.ts (PDF export)
 *   - SeatingChartPublicView.tsx (public share view)
 * 
 * All values in millimetres, targeting Australian A4 portrait (210 × 297 mm).
 * 
 * ZONE MODEL (top → bottom, no overlap):
 *   ┌─────────────────────────────┐  0 mm
 *   │  TOP_MARGIN (10 mm)         │
 *   ├─────────────────────────────┤ 10 mm
 *   │  HEADER ZONE (28 mm)        │
 *   │  (event name, subtitle,     │
 *   │   ceremony/reception lines, │
 *   │   divider, column headers)  │
 *   ├─────────────────────────────┤ 38 mm  ← CONTENT_START
 *   │                             │
 *   │  CONTENT ZONE (225 mm)      │
 *   │  2 columns × 30 rows each   │
 *   │  row height = 7.5 mm        │
 *   │                             │
 *   ├─────────────────────────────┤ 263 mm ← FOOTER_START
 *   │  GAP (2 mm)                 │
 *   │  FOOTER ZONE (32 mm)        │
 *   │  (logo 12 mm + meta 7pt)    │
 *   └─────────────────────────────┘ 297 mm
 * 
 * DO NOT change these values without updating all three consumers.
 * ============================================================================
 */

// ── Page ────────────────────────────────────────────────────────────────────
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

// ── Margins ─────────────────────────────────────────────────────────────────
export const MARGIN_LEFT_MM = 12.7;
export const MARGIN_RIGHT_MM = 12.7;
export const MARGIN_TOP_MM = 10;

// ── Header zone ─────────────────────────────────────────────────────────────
export const HEADER_HEIGHT_MM = 28;

// ── Content zone ────────────────────────────────────────────────────────────
export const CONTENT_START_MM = MARGIN_TOP_MM + HEADER_HEIGHT_MM; // 38 mm
export const CONTENT_HEIGHT_MM = 225; // fixed — never changes
export const COLUMN_GAP_MM = 12;
export const GUESTS_PER_COLUMN = 30;
export const GUESTS_PER_PAGE = GUESTS_PER_COLUMN * 2; // 60
export const ROW_HEIGHT_MM = CONTENT_HEIGHT_MM / GUESTS_PER_COLUMN; // 7.5 mm

// ── Footer zone ─────────────────────────────────────────────────────────────
export const FOOTER_START_MM = CONTENT_START_MM + CONTENT_HEIGHT_MM; // 263 mm
export const FOOTER_GAP_MM = 2;
export const FOOTER_LOGO_HEIGHT_MM = 12;
export const FOOTER_LOGO_WIDTH_MM = 42;
export const FOOTER_META_Y_MM = PAGE_HEIGHT_MM - 3; // 294 mm
export const FOOTER_LOGO_Y_MM = FOOTER_META_Y_MM - FOOTER_LOGO_HEIGHT_MM - 2; // 280 mm

// ── Content area width ──────────────────────────────────────────────────────
export const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM;
export const COLUMN_WIDTH_MM = (CONTENT_WIDTH_MM - COLUMN_GAP_MM) / 2;

// ── Pagination helper ───────────────────────────────────────────────────────
export interface PageSlice<T> {
  guests: T[];
  col1Count: number;
  startIndex: number;
  endIndex: number;
}

export function paginateGuests<T>(allGuests: T[]): PageSlice<T>[] {
  const pages: PageSlice<T>[] = [];
  for (let i = 0; i < allGuests.length; i += GUESTS_PER_PAGE) {
    const pageGuests = allGuests.slice(i, i + GUESTS_PER_PAGE);
    const col1Count = Math.min(GUESTS_PER_COLUMN, pageGuests.length);
    pages.push({
      guests: pageGuests,
      col1Count,
      startIndex: i,
      endIndex: i + pageGuests.length,
    });
  }
  return pages;
}
