
Goal: fix the active Full Seating Chart PDF download path so it matches the on-screen preview capacity: 25 guests in the left column and up to 25 in the right column, with no other layout changes.

What I found
- The preview is already using the newer capacity math:
  - `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`
  - `availableHeight = 210` and small font = `25 guests per column`
- The active PDF generator is also using the newer math:
  - `src/lib/fullSeatingChartPdfExporter.ts`
  - `availableHeight = 210` and small font = `25 guests per column`
- The mismatch is in the page that triggers the single-page download:
  - `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx`
  - it still calculates `availableHeight = 195`, which makes small font export only `23 per column / 46 per page`
- That is why your downloaded file shows:
  - left column `1–25`
  - right column only `26–46`
  - header total `46`
  instead of using the same 50-slot first page capacity as the preview.

Implementation plan
1. Update only the active single-page download pagination logic in `FullSeatingChartPage.tsx`
   - change the stale `availableHeight = 195` calculation to match the current preview/PDF logic (`210`)
   - update the stale comments so they reflect `25 per column / 50 per page` for small font

2. Keep the actual PDF rendering code in `src/lib/fullSeatingChartPdfExporter.ts` unchanged
   - it already uses the correct 25-per-column pagination
   - this avoids changing any spacing, typography, footer, or layout that you said to leave alone

3. Do not change the preview
   - the dashboard preview is already behaving the way you want

4. Do not touch unrelated/legacy exporter code unless needed
   - `src/components/Dashboard/FullSeatingChart/FullSeatingChartExporter.tsx` still contains old 10/20 logic, but it does not appear to be the path currently used by the download buttons
   - to honor “do not change anything else,” I would leave that file alone unless verification shows it is still wired somewhere

Expected result after implementation
- Download PDF (single page) will use the same first-page capacity as the preview
- Small font first page will allow up to `50 guests total` (`25 + 25`)
- If there are 46 guests on that exported page, the right column will show guests through `46` because that is the full guest count passed for that export
- If there are 50+ guests in the event, the first downloaded page will now correctly reserve space for all 25 rows in both columns before overflowing to the next page path

Files to change
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx`

Technical note
```text
Current flow
Preview: 210mm -> 25/column
PDF lib: 210mm -> 25/column
Page download trigger: 195mm -> 23/column  <-- bug

Planned fix
Page download trigger: 210mm -> 25/column
```

Validation I would do after implementing
- With small font, confirm the first page download slices `50` guests, not `46`
- Confirm the right column can populate up to guest `50`
- Confirm Download PDF and Download All PDF still use the same visible layout and no footer/header measurements change
- Confirm no changes to preview behavior
