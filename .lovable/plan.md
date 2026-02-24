

# Move Export Controls to Right Side of Dropdowns Row (Place Cards)

## What's Changing

The Export Controls box on the Place Cards page will be repositioned to sit on the **same line** as the "Choose Event" and "Table" dropdowns, aligned to the right. Currently it wraps below due to `flex-wrap`.

## Visual Result

```text
| Choose Event: [dropdown]   Table: [dropdown]   | Export Controls ... [PDF] [All PDF] |
```

## Technical Details

### File: `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` (lines 315-406)

The container at line 315 already uses `flex items-center justify-between gap-4 flex-wrap`. The fix is:

1. Remove `flex-wrap` from the outer container (line 315) so it stays on one row
2. Add `flex-nowrap` to ensure everything stays on one line
3. Adjust the dropdowns wrapper to use `flex-shrink-0` so they don't collapse
4. Allow the Export Controls box to shrink slightly on smaller screens with responsive wrapping only at mobile breakpoints (`sm:flex-nowrap`)

This keeps the Export Controls anchored to the right on desktop/tablet while allowing graceful stacking on mobile.

