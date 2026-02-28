
# Widen the Custom Name Place Cards Panel

## What's Changing
The "Custom Name Place Cards" customizer panel on the left side of the Place Cards page will be made wider to give its content more breathing room, matching approximately where the red line is drawn in your screenshot.

## Technical Detail

**File:** `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` (lines 432-443)

- Change the grid from `grid-cols-1 lg:grid-cols-4` to `grid-cols-1 lg:grid-cols-5`
- Change the customizer column span from `lg:col-span-1` to `lg:col-span-2`
- The preview panel stays at `lg:col-span-3`

This gives the customizer 40% of the width (2 of 5 columns) instead of 25% (1 of 4 columns), providing significantly more room for the design controls, radio buttons, and background options.

Nothing else is changed.
