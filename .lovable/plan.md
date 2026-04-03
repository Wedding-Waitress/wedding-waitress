

## Plan: Align Full Seating Chart A4 Preview to Match PDF Download

### Problem
The A4 preview on the dashboard has more padding/spacing than the actual PDF download, particularly in the footer area where the Wedding Waitress logo sits higher with more padding than in the PDF. The screen preview should be a pixel-perfect representation of what the PDF looks like.

### Changes

**File: `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`**

Adjust the screen version (lines 500-617) to match the PDF's tighter layout:

1. **Footer section** (lines 598-613): Reduce the `minHeight` from `25mm` to match the PDF's `FOOTER_ZONE_MM` (30mm total from bottom, but the logo sits at ~PDF_HEIGHT_MM - 5 - 12 - 2 = ~278mm). Remove extra `pt-2` padding on the logo container and `mt-1` on the meta line. Position the logo and metadata closer to the absolute bottom of the page, mirroring the PDF's `FOOTER_LOGO_Y_MM` and `FOOTER_TEXT_Y_MM` placement.

2. **Header spacing** (lines 514-539): Tighten `mb-2` on the header container and adjust margins on the event name, subtitle, and info lines to match the PDF's exact vertical positions (6mm between event name and subtitle, 5mm to ceremony line, 4mm between lines, 2mm after divider).

3. **Guest list area** (lines 563-595): Adjust `maxHeight` calculation to account for the tighter header and footer, ensuring the guest rows fill the same proportion of the page as in the PDF.

4. **Content padding** (line 512): The PDF uses 12.7mm margins. The screen uses `padding: '1.27cm'` which is equivalent -- this stays the same.

### Technical Details

The PDF exporter uses these exact positions:
- Margin: 12.7mm
- Footer zone: 30mm from bottom
- Logo Y: ~278mm (PDF_HEIGHT - 5 - 12 - 2)
- Footer text Y: ~292mm (PDF_HEIGHT - 5)
- Purple divider: 2mm gap after last info line
- Column header bar: 6mm height, 4mm gap after

The screen preview will be updated to use equivalent CSS values (converting mm to the same units) so both outputs look identical. The key fix is making the footer sit at the very bottom with minimal gap, matching the PDF's tight positioning.

