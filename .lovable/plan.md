

# Fix Running Sheet PDF Export

## Problem

The current Running Sheet PDF uses raw jsPDF text drawing which causes:
- **Text overlapping/bleeding** between rows (clearly visible in the screenshot)
- **No multi-page support** -- long running sheets get cut off
- **Section headers not visually distinct** (bold red styling missing)
- **Multi-line Event text not rendered properly** -- newlines cause text to overlap

The other exporters (Individual Table Charts, Dietary Requirements, Full Seating Chart) all work correctly because they use the **html2canvas** approach: generate clean HTML, render it offscreen, then capture as an image into the PDF.

## Solution

Rewrite `src/lib/runningSheetPdfExporter.ts` to use the same proven html2canvas methodology used by all other working PDF exporters in the app.

### How it will work:

1. **Generate clean HTML** for the running sheet (header with event name, dates, venues + table with Time/Event/Who columns)
2. **Render offscreen** in an A4-sized container (794x1123px)
3. **Capture with html2canvas** at scale 3 for crisp text
4. **Add to jsPDF** as a full-page image
5. **Multi-page support**: if content exceeds one page, split across multiple pages automatically

### HTML Template will include:
- Purple event name header (matching current style)
- "Running Sheet" subtitle
- Reception and Ceremony date/venue/time details
- Purple divider line
- Section label in purple
- Section notes in italic grey (if present)
- Clean table with TIME / EVENT / WHO columns
- Section header rows styled in **bold red** (matching dashboard)
- Multi-line text in Event column properly rendered with line breaks
- Wedding Waitress logo at bottom
- "Generated" timestamp

### Key differences from current approach:
| Current (broken) | New (html2canvas) |
|---|---|
| Raw jsPDF text positioning | HTML rendered to canvas |
| Text overlaps on multi-line content | Proper HTML line wrapping |
| No pagination | Auto-pagination for long sheets |
| Section headers not styled | Bold red section headers |
| Single font rendering | Full CSS text rendering |

## Files Changed

| File | Change |
|------|--------|
| `src/lib/runningSheetPdfExporter.ts` | Rewrite to use html2canvas approach matching other exporters |

## Technical Notes

- The file is marked "LOCKED FOR PRODUCTION" but the user (the owner) is explicitly requesting this fix, so this constitutes owner approval
- Only the PDF export engine changes -- no changes to the running sheet UI, data model, sharing, or any other functionality
- The exported function signatures (`exportRunningSheetPDF`, `exportRunningSheetSectionPDF`) remain identical so no caller changes needed
- Uses the same `html2canvas` + `jsPDF` pipeline proven across all other chart exporters
- Logo loaded from `@/assets/wedding-waitress-new-logo.png` (same as individual table chart engine)

