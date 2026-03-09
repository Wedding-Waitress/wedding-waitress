

## Plan: Move "Update Your Details" to Guest Search Results

### Problem
The "Update Your Details" green button in the 6-button grid is a tab trigger for the already-active "search" tab, so clicking it does nothing. This confuses guests.

### Solution
1. **Remove "Update Your Details" from the button grid** — convert from 6 buttons (3×2) to 5 buttons. Rearrange as a 5-button layout (e.g., 3 top + 2 bottom, or 3+2 centered).

2. **Replace the purple "Edit" button in `EnhancedGuestCard.tsx`** with a green-styled "Update Your Details" button — green background, green border, bold text, matching the current green button style. Remove the pencil icon.

3. **Adjust grid layout in `GuestLookup.tsx`** — with 5 buttons, use a layout that looks balanced (likely keep `grid-cols-3` for the first row of 3, and center the remaining 2 below).

### Files to Change
- **`src/pages/GuestLookup.tsx`** — Remove the "Update Your Details" TabsTrigger from the grid. Adjust the remaining 5 buttons layout.
- **`src/components/GuestLookup/EnhancedGuestCard.tsx`** — Restyle the "Edit" button to green with "Update Your Details" label, remove pencil icon.

