

## Plan: Add Gap After Column Headers + Alternating Row Borders

### What We're Doing

1. **Add one line of gap** between the column headers bar ("GUESTS 1-19 / TABLE") and the first row of guests (Adam Saad / Garry Wentworth). Applied to both the dashboard preview and PDF export.

2. **Add subtle bottom border lines** on alternating guest rows for easy reading. Every other row (1st, 3rd, 5th...) gets a very light gray bottom border line spanning the full width of the column. This keeps it clean without covering any text or clashing with the light gray relation info text.

### Why Borders, Not Background

A background fill risks clashing with the light gray sub-text (relation/dietary info). A subtle bottom border line cleanly separates rows without obscuring any content. It's the approach used in professional seating charts and table layouts.

### Changes

**File: `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`**

1. **ScreenGuestRow** (~line 241): Accept an `index` prop. On even-indexed rows (0, 2, 4...), add `borderBottom: '1px solid #e5e5e5'` to the row container. This gives a light separator line every other row.

2. **Guest list columns** (~lines 584-601): Pass the row index to ScreenGuestRow. Add `paddingTop: '3mm'` (one line gap) to the guest list container to separate it from the column headers bar. Change `marginBottom: '1mm'` on the column headers bar to `marginBottom: '0'` since the gap will be on the guest list side.

3. **PrintGuestRow** (~line 282): Same alternating border treatment for print consistency.

**File: `src/lib/fullSeatingChartPdfExporter.ts`**

1. **Gap after header bar** (~line 272): Change `yPos = headerBarY + headerBarHeight + 4` to `+ rowHeight` (approximately one row height gap).

2. **Alternating row borders** (~line 277 loop): After drawing each even-indexed guest row, draw a light gray line (`pdf.setDrawColor(229, 229, 229)`) spanning the full column width at the bottom of that row.

**File: `src/lib/fullSeatingChartDocxExporter.ts`**

1. Apply matching bottom border on alternating rows in the DOCX table cells.

### Technical Details

- Border color: `#e5e5e5` (very light gray) - won't clash with `#666` sub-text
- Border thickness: 0.3mm in PDF, 1px on screen
- Pattern: even index rows (0, 2, 4...) get the border; odd rows stay clean
- Gap after headers: ~1 row height worth of space (~10mm for small font)

