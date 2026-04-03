

## Plan: Reduce Running Sheet PDF Side Margins to 5mm

### What
Reduce the left and right margins of the Running Sheet PDF from the current ~13mm (48px) to 5mm (~19px) on each side, so the table content stretches wider and utilizes more of the A4 page.

### Current State
- The HTML container has `padding: 40px 48px 0 48px` (48px = ~12.7mm on each side)
- This leaves noticeable white space, especially on the right

### Change

**File: `src/lib/runningSheetPdfExporter.ts` (line 164)**

Update the container padding from `48px` left/right to `19px` left/right (5mm equivalent at 96 DPI):

```
padding: 40px 48px 0 48px  →  padding: 40px 19px 0 19px
```

This single change will make the table stretch ~29px wider on each side, giving you 5mm margins from the edge of the A4 paper. The header, event details, and purple divider will also stretch to match.

### No other changes
- Footer positioning (handled by jsPDF in mm) is unaffected
- Column ratios (15%/65%/20%) stay the same
- Font sizes, colors, and all other layout elements remain unchanged

