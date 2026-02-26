
# Change "Individual" to "Single" in Guest List Table Rows

## Problem
The guest type badges in the Family/Group column of the guest list table still display "Individual" instead of "Single". The stats badge at the top was already updated, but the per-row badges were missed.

## Change

**File:** `src/components/Dashboard/GuestListTable.tsx`

Update the `getGuestTypeLabel` helper function (lines 759-773) to return `'Single'` instead of `'Individual'` in both the main return and the fallback return. This single change will fix all row-level badges throughout the table since they all derive their label from this function.
