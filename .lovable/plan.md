

# Adjust Guest Name Vertical Offset Range

## What's Changing
The vertical slider for Guest Name currently ranges from **-15mm to +15mm**. Based on the screenshots:
- At **-15mm** (top), the name overlaps the card edge -- too far up
- At **+15mm** (bottom), there's still plenty of room -- not far enough down

The range will be changed to **-12mm to +25mm** so:
- Moving up stops just before the top edge (no overlap)
- Moving down reaches close to the bottom edge

## Technical Detail

**File:** `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

- Change the `min` prop on the Guest Name vertical slider from `-15` to `-12`
- Change the `max` prop from `15` to `25`

This is a two-line change on lines 611-612.

