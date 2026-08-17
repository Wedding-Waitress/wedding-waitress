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
 *   │  2 columns × 25 rows each   │
 *   │  row height = 9 mm          │
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
export const MARGIN_LEFT_MM = 8;
export const MARGIN_RIGHT_MM = 8;
export const MARGIN_TOP_MM = 10;

// ── Header zone ─────────────────────────────────────────────────────────────
export const HEADER_HEIGHT_MM = 28;

// ── Content zone ────────────────────────────────────────────────────────────
export const CONTENT_START_MM = MARGIN_TOP_MM + HEADER_HEIGHT_MM; // 38 mm
export const CONTENT_HEIGHT_MM = 225; // fixed — never changes
export const COLUMN_GAP_MM = 8;
export const GUESTS_PER_COLUMN = 25;
export const GUESTS_PER_PAGE = GUESTS_PER_COLUMN * 2; // 50
export const ROW_HEIGHT_MM = CONTENT_HEIGHT_MM / GUESTS_PER_COLUMN; // 9 mm

export type FullSeatingChartGuestTextSize = 'small' | 'standard' | 'large';

// Guest Text Size changes glyph size only. Every option uses the same fixed
// 25-position grid so preview and PDF pagination never change with typography.
export const FULL_SEATING_CHART_ROW_HEIGHTS_MM: Record<FullSeatingChartGuestTextSize, number> = {
  small: 9,
  standard: 9,
  large: 9,
};

export const getFullSeatingChartRowHeightMm = (fontSize: FullSeatingChartGuestTextSize) =>
  FULL_SEATING_CHART_ROW_HEIGHTS_MM[fontSize];

export const getFullSeatingChartGuestsPerColumn = (_fontSize?: FullSeatingChartGuestTextSize) =>
  GUESTS_PER_COLUMN;

export const getFullSeatingChartGuestsPerPage = (_fontSize?: FullSeatingChartGuestTextSize) =>
  GUESTS_PER_PAGE;

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

export function paginateGuests<T>(allGuests: T[], fontSize?: FullSeatingChartGuestTextSize): PageSlice<T>[] {
  const guestsPerColumn = getFullSeatingChartGuestsPerColumn(fontSize);
  const guestsPerPage = getFullSeatingChartGuestsPerPage(fontSize);
  const pages: PageSlice<T>[] = [];
  for (let i = 0; i < allGuests.length; i += guestsPerPage) {
    const pageGuests = allGuests.slice(i, i + guestsPerPage);
    const col1Count = Math.min(guestsPerColumn, pageGuests.length);
    pages.push({
      guests: pageGuests,
      col1Count,
      startIndex: i,
      endIndex: i + pageGuests.length,
    });
  }
  return pages;
}
