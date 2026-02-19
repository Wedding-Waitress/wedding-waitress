

# Fix Step Counter Position and Close Button Alignment

## Two Issues

1. **"1 of 1" badge** is too far right -- move it closer to "Assign Relation" title, keeping a small gap but not pushed to the edge
2. **X icon** is not centered inside its purple-bordered box -- needs proper centering

## Technical Changes

**File: `src/components/Dashboard/RelationAssignmentDialog.tsx`**

1. Change the header layout from `justify-between` to `justify-start` with a gap, so the badge sits naturally next to the title instead of being pushed to the far right
2. On the DialogContent, add flex/centering styles to the close button so the X icon sits perfectly centered: `[&>button]:flex [&>button]:items-center [&>button]:justify-center`

