

## Swap Text Color & Text Style Positions in Place Cards Customizer

### What changes
In `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`, swap the order of the two fields in Row 2 of both "Guest Name" and "Table & Seat" boxes, and rename "Color" to "Text Color".

### Guest Name box (lines 313-343)
Current Row 2 order: **Text Style** (left) | **Color** (right)
New Row 2 order: **Text Color** (left) | **Text Style** (right)

- Move the ColorPickerPopover block to be the first child in the grid
- Move the Text Style Select block to be the second child
- Rename label from "Color" to "Text Color"

### Table & Seat box (lines 379-409)
Same swap:
- Move ColorPickerPopover to first position, rename "Color" → "Text Color"
- Move Text Style Select to second position

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

