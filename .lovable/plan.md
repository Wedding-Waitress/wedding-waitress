

# Plan: Increase Preview Guest Row Height

## Summary
Increase the vertical height of each guest row in the Full Seating Chart **preview only** to close the gap between the last guest row and the Wedding Waitress logo. PDF export is untouched.

## What Changes

### `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`

1. **ScreenGuestRow minHeight**: Currently uses `rowHeightMm * 2 - 1` pixels. Increase this multiplier so each row is taller on screen. Target: rows visually fill more of the content zone, reducing the empty gap above the logo.

2. **Only the preview row rendering is affected** — the `rowHeightMm` value from the shared layout constants is not changed, and no PDF code is modified.

## What Does NOT Change
- `src/lib/fullSeatingChartLayout.ts` — no constants modified
- `src/lib/fullSeatingChartPdfExporter.ts` — completely untouched
- PDF download (single page and all pages) — completely untouched
- Number of guests per column (30) and per page (60) — unchanged
- Font sizes — unchanged
- Footer position — unchanged

