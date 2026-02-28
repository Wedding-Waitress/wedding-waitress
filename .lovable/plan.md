

# Increase Guest Name Horizontal Offset Range

## What's Changing
The Guest Name horizontal position slider currently goes from **-15mm to +15mm**, which isn't enough to push the name close to the card edges. The range will be increased to **-25mm to +25mm** to allow more movement.

## Technical Detail

**File:** `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

- Change the `min` prop on the Guest Name horizontal slider from `-15` to `-25`
- Change the `max` prop from `15` to `25`

This is a single two-line change on lines 597-598.

