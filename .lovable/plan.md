

## Balance the Three Boxes with Equal Spacing

### What Changes

The three boxes (Choose Event, Type of Event, Guest Relations) will have equal width and balanced spacing, with the right-side gap matching the left-side gap.

### Technical Details

**File**: `src/components/Dashboard/GuestListTable.tsx` (line 1377)

**Current**: The container has `pr-1` which adds a tiny right padding, but this doesn't match the natural left margin provided by the parent card's padding.

**Fix**: Remove `pr-1` from the flex container. The parent card component already applies equal `p-4 md:p-6` padding on all sides, so removing the extra `pr-1` will let the three `flex-1` boxes sit evenly within the card, with matching gaps on both left and right edges.

That single class removal is the only change needed -- the three boxes already use `flex-1` for equal widths and `gap-4` for spacing between them.

