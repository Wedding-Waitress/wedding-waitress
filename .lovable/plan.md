

# Reduce Guest Name Vertical Top Range

## What's Changing
The Guest Name vertical slider currently allows going up to **-12mm**, which still causes the name to overlap the top edge. The minimum will be reduced to **-9mm** so the name stays close to -- but not touching -- the top edge.

## Technical Detail

**File:** `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

- Change the `min` prop on the Guest Name vertical slider from `-12` to `-9` (line 611)

Single one-line change.

