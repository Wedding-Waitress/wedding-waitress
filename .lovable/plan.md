

## Improve Place Cards Layout Spacing & Label Positioning

### Overview
Narrow the left customizer panel, widen the right preview area, and reposition the guide labels so they sit vertically stacked below the Master Card instruction box — all in the purple gap between panel and A4.

### Changes

**1. `PlaceCardsPage.tsx` — Adjust grid ratio (line 435)**
- Change from `lg:grid-cols-5` with 2/3 split to `lg:grid-cols-7` with 2/5 split
- Left panel: `lg:col-span-2` (narrower)
- Right panel: `lg:col-span-5` (wider, more purple gap)

**2. `PlaceCardPreview.tsx` — Reposition guide labels (lines 712-742)**
- Keep the Master Card instruction box at its current position (`top: 2mm`)
- Move the three labels ("Back of card", "Fold", "Front of card") so they remain at their correct vertical alignment points (24.75mm, 49.5mm, 74.25mm) but shift the entire label column further left: change `right: 'calc(50% + 105mm + 20px)'` to `right: 'calc(50% + 105mm + 30px)'` to ensure labels don't hide behind the A4 edge with the wider preview area
- Keep all existing styling, arrows, and scope rules unchanged

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

