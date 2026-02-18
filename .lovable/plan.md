

## Fix: Drop Indicator Always Showing Below Instead of Dynamically

### Problem

The current code calculates the pointer's Y position as `activatorEvent.clientY + delta.y`, where `activatorEvent` is the original mousedown event. Combined with `over.rect` (which is a snapshot rect from dnd-kit's measurement system), the coordinate spaces don't always align. This causes the midpoint comparison to almost always resolve to "below", so the purple line never appears above a guest.

### Solution

Track the **real-time pointer position** via a `pointermove` event listener on the document, stored in a ref. In `handleDragOver`, use `document.getElementById(over.id)?.getBoundingClientRect()` for a live DOM measurement of the hovered guest. Compare the live pointer Y against the live element midpoint.

### Changes (1 file)

**`src/components/Dashboard/Tables/SortableTablesGrid.tsx`**

1. Add a `pointerPositionRef` (`useRef<{x: number, y: number}>`) to track real-time pointer coordinates
2. Add a `useEffect` that attaches a `pointermove` listener to `document` during active drags (when `activeGuest` is set), updating the ref on every move, and cleans up when drag ends
3. Replace the midpoint calculation in `handleDragOver` (lines 243-257): instead of using `activatorEvent.clientY + delta.y` and `over.rect`, use `pointerPositionRef.current.y` and `document.getElementById(String(over.id))?.getBoundingClientRect()` for accurate live coordinates
4. No changes to `handleDragEnd` -- the insertion logic already correctly reads `overGuestPosition`

### Technical Detail

```text
Current (broken):
  pointerY = activatorEvent.clientY + delta.y   <-- stale coordinate space
  midpoint = over.rect.top + over.rect.height/2  <-- snapshot rect
  Result: comparison unreliable, almost always "below"

Fixed:
  pointerY = pointerPositionRef.current.y         <-- live pointer from pointermove
  rect = document.getElementById(over.id).getBoundingClientRect()  <-- live DOM rect
  midpoint = rect.top + rect.height / 2
  Result: accurate comparison, indicator shows above or below correctly
```

### Result

- The purple indicator line will appear above a guest when the pointer is in their top half
- The purple indicator line will appear below when the pointer is in their bottom half
- The guest will drop exactly where the line shows
- Works for both mouse and touch interactions

