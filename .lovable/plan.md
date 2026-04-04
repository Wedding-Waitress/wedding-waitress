

# Plan: Increase Guest Row Height in Preview

## Summary
Increase the vertical padding of each guest row in the Full Seating Chart **preview only** by raising the row height multiplier, giving each guest more breathing room around the faint gray divider line. All 30 rows per column will still fit.

## What Changes

### `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`

1. **ScreenGuestRow minHeight**: Change multiplier from `rowHeightMm * 2.4` to `rowHeightMm * 2.65` (increases each row from ~18px to ~20px)
2. **Container height**: Increase from `300mm` to `305mm` to accommodate the slightly taller rows while keeping all 30 visible

## What Does NOT Change
- `src/lib/fullSeatingChartLayout.ts` — no constants modified
- `src/lib/fullSeatingChartPdfExporter.ts` — completely untouched
- Download Single Page PDF — untouched
- Download All Pages PDF — untouched
- Font sizes — unchanged
- Guest count per column (30) — unchanged
- Footer logo and page info — unchanged

