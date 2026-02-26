

# Make Guest Card More Compact

## What Changes
Tighten the vertical spacing inside the guest details card so the name, table, seat, dietary, and RSVP sections are closer together, while still maintaining readable gaps between them.

## Technical Details

**File:** `src/components/GuestLookup/EnhancedGuestCard.tsx`

1. **Reduce CardContent padding** (line 140): Change `p-6` to `p-4` to pull everything up within the card
2. **Reduce vertical gap between sections** (line 141): Change `space-y-2.5` to `space-y-1.5` (6px gaps instead of 10px)
3. **Reduce row padding** on Table, Seat, and Dietary rows (lines 197, 216, 227): Change `p-3` to `p-2` for tighter inner padding
4. **Reduce RSVP section internal spacing** (line 237): Change `space-y-3` to `space-y-2`

These changes will bring all elements noticeably closer together while still maintaining clear visual separation between each row.

