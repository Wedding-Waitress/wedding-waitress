
# Move & Restyle "Total Designs" Counter in Both Gallery Headers

## What Changes

Move the purple "X Total Designs" text from the far right to directly after the gallery title text, on the same line, matching the heading font size. Capitalize "Total" and "Designs".

## Files to Modify

### 1. `src/components/Dashboard/Invitations/InvitationGalleryModal.tsx` (lines 47-53)
- Remove `justify-between` from DialogTitle
- Move the count span inside the left span, right after "Invitation Image Gallery"
- Change text size from `text-sm` to match heading size (`text-lg`)
- Update text to `{images.length} Total Designs`

### 2. `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx` (lines 48-54)
- Same changes: remove `justify-between`, move count next to title, match size, capitalize

## Result

Before: `Invitation Image Gallery` .................. `314 total designs`
After: `Invitation Image Gallery  314 Total Designs`
