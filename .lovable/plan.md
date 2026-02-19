
# Remove "Swap Seat With" from Edit Guest Modal

## What's Changing

Remove the entire "Swap Seat With" dropdown section from the Edit Guest popup. Users can still swap seats via drag-and-drop on the Tables page.

## Technical Changes

**File: `src/components/Dashboard/AddGuestModal.tsx`**

1. **Remove the UI block** (lines 1187-1214) -- the "Swap Seat With" label, dropdown, and helper text
2. **Remove the swap logic in the save handler** (around lines 612-660) -- the 3-step seat swap database operations
3. **Remove state variables** (lines 127-128) -- `swapWithGuestId` and `sameTableGuests`
4. **Remove the `useEffect`** that populates `sameTableGuests` when editing a seated guest
5. **Remove the reset calls** for `swapWithGuestId` and `setSameTableGuests` in the form reset function
6. **Remove the `RefreshCw` icon import** if no longer used elsewhere
