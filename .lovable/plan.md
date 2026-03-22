

## Change Default Guest Name Font Size from 40pt to 30pt

### Change
Replace every instance of the default `guest_name_font_size: 40` with `guest_name_font_size: 30` across three files:

1. **`src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`** — 3 occurrences (initial state, reset defaults, Reset to Default button handler)
2. **`src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`** — 4 occurrences (fallback defaults, reset handler, resize handler fallback, effective size fallback)
3. **`src/hooks/usePlaceCardSettings.ts`** — 1 occurrence (first-save seed object)

All `40` → `30` for `guest_name_font_size`. No other changes.

