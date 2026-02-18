

## Fix: Drop Indicator Should Appear Above or Below Guest Based on Pointer Position

### Problem

Currently, when dragging a guest over another guest, the purple drop indicator line always appears in the same position regardless of where your pointer is on that guest. The indicator should show **above** the guest when you're hovering over their top half (meaning "insert before this guest") and **below** when hovering over their bottom half (meaning "insert after this guest").

### Solution

Track the pointer's vertical position relative to each guest element. If the pointer is in the top half of the guest, show the indicator above; if in the bottom half, show it below. The insertion logic in `handleDragEnd` will also be updated to match, so the guest always lands exactly where the indicator shows.

### Changes (3 files)

**1. `src/components/Dashboard/Tables/SortableTablesGrid.tsx`**

- Add a new state: `overGuestPosition` ("above" or "below")
- In `handleDragOver`, calculate whether the pointer is in the top or bottom half of the hovered guest element using the `event` collision rect data
- Pass `overGuestPosition` through the drag state context
- Update `handleDragEnd` insertion logic: if position is "below", insert AFTER the target guest; if "above", insert BEFORE

**2. `src/components/Dashboard/Tables/SortableGuestItem.tsx`**

- Accept `overGuestPosition` ("above" | "below") instead of relying on `showIndicatorAfter`
- Show the purple indicator line at `-top` when position is "above", at `-bottom` when position is "below"

**3. `src/components/Dashboard/Tables/TableGuestList.tsx`**

- Read `overGuestPosition` from drag state context
- Pass it to each `SortableGuestItem` when that guest is the one being hovered over

### Technical Detail

In `handleDragOver`, determine pointer position relative to the hovered guest:

```text
1. Get the over element's bounding rect from the droppable container
2. Calculate the vertical midpoint of the element
3. Compare the pointer Y position to the midpoint
4. If pointer Y < midpoint -> position = "above" (insert before)
5. If pointer Y >= midpoint -> position = "below" (insert after)
```

In `handleDragEnd`, adjust insertion index:

```text
- If overGuestPosition is "above": insertAtIndex = overIndex (before the target)
- If overGuestPosition is "below": insertAtIndex = overIndex + 1 (after the target)
- Remove the special "last guest" logic since position now handles all cases
```

### Result

- The purple indicator line will appear exactly where the guest will be placed -- above or below the hovered guest
- Dragging to the top half of a guest inserts before them; bottom half inserts after them
- This works consistently for all guests (first, middle, last) on all tables
