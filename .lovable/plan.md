

# Make Edit Button a True Circle with Matching Font

## What Changes
Make the Edit button on the guest card a proper visible circle (like the close button on the Wedding Menu modal) and increase the "Edit" text size to match the row labels (Table, Seat, Dietary).

## Technical Details

**File:** `src/components/GuestLookup/EnhancedGuestCard.tsx` (line 182)

- Increase button size from `w-10 h-10` to `w-14 h-14` so it forms a clearly visible circle with room for the text
- Change text from `text-xs` to `text-sm font-semibold` to match the row label font size
- Keep `rounded-full` and `p-0` to ensure perfect circle shape
- Add `aspect-square` for extra safety on circle rendering

