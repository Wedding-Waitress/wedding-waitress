

## Move Box 4 Inline with Boxes 1, 2, 3

### What Changes

Box 4 ("Let the fun begin!") will move from its current position below the 3-column grid to sit on the **same row** as boxes 1, 2, and 3, to the right of box 3. The grid will change from 3 columns to a layout where the first three boxes share equal width and the fourth box takes only the space it needs.

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Step 1 -- Change the grid layout (line 1405)**
- Update from `grid grid-cols-1 md:grid-cols-3 gap-4` to `grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-start`
- This gives boxes 1-3 equal width (`1fr` each) and box 4 only takes the space it needs (`auto`)

**Step 2 -- Move Box 4 inside the grid (lines 1591-1608)**
- Remove the wrapper `<div className="flex justify-end mt-4">` around Box 4
- Move the Box 4 content (the inner div with border, heading, and button) into the grid, right after Box 3 (before the grid's closing `</div>` on line 1589)
- Keep the same styling on the box itself: `border-2 border-primary rounded-lg p-4 flex flex-col items-start gap-3 bg-primary/10`

**Step 3 -- Delete the now-empty Box 4 section (lines 1591-1608)**
- Remove the old standalone Box 4 block that is no longer needed

