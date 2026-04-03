

# Plan: Dynamic Guest Capacity When Display Options Are Off

## What Changes

When **both** Show Dietary Requirements and Show Relationships are turned off, increase capacity from 25 guests per column (50/page) to 35 guests per column (70/page). When either or both are on, keep the current 25/column (50/page). This applies to the preview, single-page PDF download, and all-pages PDF download.

## How It Works

The current code uses `availableHeight = 210` which at row height `8.4` gives `210/8.4 = 25` guests per column. When both display options are off, we change this to `availableHeight = 294` which gives `294/8.4 = 35` guests per column. The extra space comes from not needing room for dietary/relationship text lines under each guest.

## Files to Change (3 files, same logic in each)

### 1. `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx` (~line 89)
- Change `availableHeight` from hardcoded `210` to conditional:
  - Both `showDietary` and `showRelation` off → `294`
  - Otherwise → `210`
- Add `settings.showDietary` and `settings.showRelation` to the `useMemo` dependency array

### 2. `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` (~line 116)
- Same conditional `availableHeight` logic in the `guestsPerPage` calculation
- Add `settings.showDietary` and `settings.showRelation` to the `useMemo` dependency array

### 3. `src/lib/fullSeatingChartPdfExporter.ts` (~line 187)
- Same conditional `availableHeight` logic in the pagination calculation

## What Stays the Same
- Row height remains `8.4` for small font
- All header, footer, margin measurements unchanged
- When display options are on, capacity stays at 25/column (50/page)
- Font sizes, styling, bold/italic/underline -- all unchanged

