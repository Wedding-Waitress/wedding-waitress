

# Plan: Change to 30 Guests Per Column (60 Per Page)

## Summary

Reduce from 35 guests per column to 30 guests per column (60 per page) in both the screen preview and the PDF download. This gives each row more vertical space, ensuring guests never overlap the footer logo.

## Changes

### 1. `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`

**Pagination calculation (~line 80-89):**
- Change `availableHeight` from `252` to `252` (keep same available space)
- Change small row height from `7.2` to `8.4` (252 / 30 = 8.4mm per row)
- This yields exactly 30 guests per column

**Screen guest list container (~line 603):**
- Keep `height: '225mm'` — 30 rows at 8.4mm = 252mm fits comfortably within this

### 2. `src/lib/fullSeatingChartPdfExporter.ts`

**Row height and pagination (~line 180-192):**
- Change small row height from `7.2` to `8.4`
- `availableHeight` stays at `252`, giving `252 / 8.4 = 30` guests per column
- This ensures all 30 rows finish well above the footer zone

### 3. `FULL_SEATING_CHART_SPECS.md` / `.lovable/plan.md`

- Update specs to reflect 30 guests per column, 60 per page

## What Stays the Same

- All header, footer, margin, logo measurements
- Font sizes (13px screen / 10.5pt PDF for small)
- Inline brackets for dietary/relation display
- Bold/italic/underline settings
- All other components and pages

