

## Plan: Widen Running Sheet PDF Side Margins

### What
Increase the left and right padding of the Running Sheet PDF content to create slightly wider gaps on both sides, while keeping everything within A4 boundaries.

### Change

**File: `src/lib/runningSheetPdfExporter.ts`** (line ~168)

Change the container padding from `padding:40px 48px 0 48px` to `padding:40px 60px 0 60px`.

This increases each side margin by 12px (from 48px to 60px), which translates to roughly 3mm extra on each side. The total content width shrinks from 698px to 674px — still well within the 794px A4 width at 96 DPI.

No other changes.

