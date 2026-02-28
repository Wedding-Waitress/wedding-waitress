

# Increase Table & Seat Number Horizontal Offset Range

## What's Changing
The Table & Seat Number horizontal position slider currently ranges from **-15mm to +15mm**, which doesn't allow the text to reach close to the card edges. The range will be increased to **-25mm to +25mm** (matching the Guest Name horizontal range).

## Technical Detail

**File:** `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

- Change the `min` prop on the Table & Seat Number horizontal slider from `-15` to `-25`
- Change the `max` prop from `15` to `25`

Single two-line change.

