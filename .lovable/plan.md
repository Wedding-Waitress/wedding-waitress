

# Plan: Fit 35 Guests Per Column in PDF Export

## Problem
The screen preview fits 35 guests per column perfectly, but the PDF download is cutting off guests because the font size (10.5pt) and row height (8.4mm) are too large — only fitting ~30 per column.

## Changes

### 1. `src/lib/fullSeatingChartPdfExporter.ts`

**Row height** (line 180-184): Change `'small'` from `8.4` to `7.2` (252 / 35 = 7.2mm per row)

**Font size** (line 51-57): Reduce `'small'` from `10.5` to `8.5pt` — proportionally smaller to fit within 7.2mm rows. Both guest names and table names will use this same reduced size.

**Available height** stays at `252mm` — this now yields `252 / 7.2 = 35` guests per column, 70 per page.

### 2. `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`

**Row height** (line 80-84): Change `'small'` from `8.4` to `7.2` to match the PDF and fit 35 per column on screen as well.

### What stays the same
- All header, footer, logo, margin measurements
- Inline brackets for dietary/relationship
- Bold/italic/underline settings
- All other pages and components

