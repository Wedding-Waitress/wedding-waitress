

## Update Master Card Labels Position & Add Instruction Box

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` (lines 712-734)

**1. Shift labels further left**
Change `right: 'calc(50% + 105mm + 8px)'` to `right: 'calc(50% + 105mm + 20px)'` to push the label column further into the purple workspace area, away from the A4 edge.

**2. Add Master Card instruction box above "Back of card"**
Insert a new element above the first label (positioned at roughly `top: 2mm`) containing:
```
This is the "Master Card".
Customise this to sync with all other cards.
```
Styled with a thin purple border (`border-primary`), white/light background, small padding, `text-[9px]`, and `whitespace-pre-line` to handle line breaks. Same `absolute` positioning pattern as the other labels.

**3. Vertical order**
- Instruction box: ~2mm from top
- Back of card: 24.75mm
- Fold: 49.5mm
- Front of card: 74.25mm

All existing scope rules remain (non-export, desktop-only, master card only).

### File modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

