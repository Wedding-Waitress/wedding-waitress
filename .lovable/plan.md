
# Fix Overlapping Badge and Close Button in Relation Assignment Dialog

## What's Wrong

In the "Assign Relation" popup header, the "1 of 2" step counter badge sits in the top-right corner and overlaps with the dialog's close (X) button. Both elements compete for the same space.

## Changes

### File: `src/components/Dashboard/RelationAssignmentDialog.tsx`

1. **Move the step counter ("1 of 2") toward the center** -- remove it from the flex header row and place it as a centered element below the title, or add right margin/padding so it no longer collides with the X button.

2. **Restructure the header** so the title is on the left and the badge sits comfortably in the middle area with enough clearance from the close button (which lives at `right-4 top-4`).

### File: `src/components/ui/dialog.tsx`

Since the close button size change should only apply to this specific dialog, we will instead handle it in `RelationAssignmentDialog.tsx` by:

- Passing a custom class to `DialogContent` that targets the close button's icon size, making the X icon 3x larger (from `h-4 w-4` / `h-5 w-5` to approximately `h-12 w-12`), OR
- Overriding the default close button by adding a custom one inside the dialog and hiding the default.

The simplest clean approach: add a custom className on `DialogContent` that uses CSS to scale up the close icon, and add `mr-10` (or similar) to the step counter so it doesn't overlap.

## Technical Summary

- **Step counter**: Add right margin (`mr-10` or `pr-10`) to keep it away from the X button area
- **Close button X icon**: Increase size to ~3x via a CSS class on DialogContent targeting the nested SVG (e.g., `[&>button>svg]:w-7 [&>button>svg]:h-7` plus larger touch target)
