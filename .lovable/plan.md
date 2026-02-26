

# Change "Family Members" Label to "Members"

## Summary
Rename the label from "Family Members (X)" to just "Members (X)" so it works generically for both Couple and Family guest types.

## Change (single file)

**File:** `src/components/GuestLookup/PublicAddGuestModal.tsx`

**Line 249:** Change `Family Members` to `Members` — the count logic and everything else stays exactly the same.

