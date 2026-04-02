

## Running Sheet PDF Export — Multi-Page Footer & Padding Fix

### Current Problem

The current approach renders ALL content as one tall HTML block, captures it as a single tall canvas, then slices it into page-sized chunks. This means:

1. **Top padding**: 40px exists on the HTML container, but only applies to page 1
2. **Bottom padding**: Only 30px — content runs to the edge on page breaks
3. **Logo/footer**: Only rendered once at the very bottom of the full content, not on every page
4. **No page numbering**: No "1 of 4 pages" indicator exists

### Solution: Per-Page Footer Overlay via jsPDF

Rather than restructuring the entire HTML rendering approach (which is locked and proven), we add the footer elements **directly via jsPDF** after each page slice is placed. This is the safest approach.

**File: `src/lib/runningSheetPdfExporter.ts`**

#### 1. Adjust Content Area to Reserve Footer Space

- Change the HTML container padding-bottom from `30px` to `0` (footer will be drawn by jsPDF)
- Define constants for footer zone height (~25mm) containing logo + page number + generated date
- Adjust `pageHeightPx` calculations to account for a reserved footer zone at the bottom of each page slice, and a reserved top margin zone on pages 2+
- The content slicing logic needs to subtract the footer reserved area so content doesn't get cut off behind the footer

#### 2. Draw Footer on Every Page via jsPDF

After placing each page's content image, use jsPDF drawing commands to add:

- **White rectangle** at the bottom (~25mm) to cover any content that bleeds into footer zone
- **Wedding Waitress logo** centered (load as image, add via `pdf.addImage`)
- **"Generated: DD/MM/YYYY HH:MM"** right-aligned, small grey text
- **"Page 1 of 4"** left-aligned (or right-aligned next to generated date), small grey text
- Use `pdf.setFontSize(7)`, `pdf.setTextColor(170,170,170)` for the metadata text

#### 3. Ensure Consistent Top/Bottom Margins on All Pages

- Page 1: keep existing 40px top padding (already in HTML)
- Pages 2+: the slice starts at an offset that accounts for content already shown, but we need to ensure the content doesn't start at the very top edge. Add a white overlay at the top (~12mm) on pages 2+ OR adjust slice positioning to leave a gap
- Bottom of every page: footer zone of ~25mm reserved

#### 4. Page Numbering Format

- Text: `"Page 1 of 4"` (matching user's request for "One of four pages" style — will use numeric for clarity)
- Position: bottom-left, same Y-level as the "Generated:" timestamp

### Technical Details

**Constants to add:**
```text
FOOTER_ZONE_MM = 22        // reserved footer height in mm
TOP_MARGIN_MM  = 12        // top margin for pages 2+
FOOTER_LOGO_HEIGHT_MM = 8  // logo height
```

**Slicing adjustment:**
- Usable content height per page = pageHeightPx - footer zone pixels - (page > 0 ? top margin pixels : 0)
- Total pages recalculated based on usable height
- Each slice is placed with appropriate Y offset

**Footer drawing (per page):**
```text
1. pdf.setFillColor(255,255,255)
2. pdf.rect(0, pdfHeight - FOOTER_ZONE_MM, pdfWidth, FOOTER_ZONE_MM, 'F')  // white cover
3. pdf.addImage(logoData, 'PNG', centerX, logoY, logoW, FOOTER_LOGO_HEIGHT_MM)
4. pdf.setFontSize(7); pdf.setTextColor(170,170,170)
5. pdf.text(`Page ${page+1} of ${totalPages}`, leftMargin, textY)
6. pdf.text(`Generated: ${timestamp}`, pdfWidth - rightMargin, textY, { align: 'right' })
```

### Files Modified
- `src/lib/runningSheetPdfExporter.ts` — all changes in the export function and HTML generator

