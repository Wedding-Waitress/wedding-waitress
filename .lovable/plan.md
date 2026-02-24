
# Move Export Controls to Right Side (Place Cards)

## What's Changing
The Export Controls box in the "Table Name Place Cards" header card currently wraps below the dropdowns due to `flex-wrap`. It will be pushed to the far right of the same line by changing `flex-wrap` to `flex-nowrap` on the container.

## Technical Details

### File: `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` (line 315)

Change `flex-wrap` to `flex-nowrap` on the outer container div so the Export Controls box stays on the same line, pushed to the right by the existing `justify-between`.

Nothing else changes -- dropdowns, buttons, styling, and structure all remain identical.
