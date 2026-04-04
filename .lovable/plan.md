

# Plan: Reduce A4 Preview Container Height

## Summary
Shrink the white A4 preview container from 310mm to ~300mm (closer to true A4 297mm) and reduce the footer offset accordingly. This closes the visible gap between the last guest row and the Wedding Waitress logo.

## What Changes

### `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`

1. **Container height**: Change from `310mm` to `300mm`
2. **Footer offset**: Reduce from `FOOTER_START_MM + FOOTER_GAP_MM + 13` to `FOOTER_START_MM + FOOTER_GAP_MM + 3` (drop the extra 13mm down to 3mm)

These two changes together bring the bottom of the white page closer to the footer content, eliminating the large white gap shown in the screenshot.

## What Does NOT Change
- `src/lib/fullSeatingChartLayout.ts` — no constants modified
- `src/lib/fullSeatingChartPdfExporter.ts` — completely untouched
- Download Single Page PDF — untouched
- Download All Pages PDF — untouched
- Guest rows, fonts, spacing, count (30 per column) — unchanged
- Wedding Waitress logo position relative to page bottom — unchanged
- Header zone — unchanged

