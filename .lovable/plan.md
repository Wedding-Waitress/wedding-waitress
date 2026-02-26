

# Update Labels in Add Extra Guest Modal (Family Mode)

## Summary
Two text label changes and a minor spacing fix in the Family section of the Add Extra Guest modal.

## Changes (single file: `src/components/GuestLookup/PublicAddGuestModal.tsx`)

### 1. Rename "Party Members" to "Family Members"
On line 249, change the label text from `Party Members` to `Family Members` (the count logic stays the same).

### 2. Rename button text
On line 278, change `"Add another member to this party"` to `"Add another member to this family"`.

### 3. Adjust Plus icon spacing
On line 277, change `mr-1` to `mr-0.5` on the Plus icon so it sits closer to the word "Add" while still having a small gap.

No other files or logic affected.

