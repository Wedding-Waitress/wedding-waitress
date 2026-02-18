

## Fix: Collision Detection Uses Dragged Item's Rect Instead of Pointer Position

### Problem

When you drag the last guest (e.g., Jessica Masry at seat 7) to the very top of a table, the system picks the **wrong guest** as the drop target. This happens because `closestCenter()` in the collision detection measures distance from the **dragged item's rectangle center** -- not your actual pointer. Since the dragged item's rect stays near where Jessica was (at the bottom), `closestCenter` finds a guest 2-3 rows down from the top, not the first guest. The indicator shows there, and the drop lands there.

### Root Cause

In `collisionDetection` (line 168), `closestCenter(args)` uses `args.collisionRect` which is the bounding box of the dragged element. This box follows the drag but its center can lag behind or differ from where the pointer actually is, especially when the drag overlay is large or offset.

### Solution

Override the `collisionRect` in the args passed to `closestCenter` with a tiny 1x1 rect centered exactly on the real-time pointer position. This way `closestCenter` will find the guest closest to where your mouse actually is, not where the dragged item's box happens to be.

### Changes (1 file)

**`src/components/Dashboard/Tables/SortableTablesGrid.tsx`**

In the `collisionDetection` callback (around line 168), replace:

```
const allClosest = closestCenter(args);
```

With logic that creates a pointer-based collision rect:

```
const pointerY = pointerPositionRef.current.y;
const pointerX = pointerPositionRef.current.x;
const pointerRect = {
  ...args.collisionRect,
  top: pointerY,
  bottom: pointerY + 1,
  left: pointerX,
  right: pointerX + 1,
  width: 1,
  height: 1,
};
const allClosest = closestCenter({ ...args, collisionRect: pointerRect });
```

This ensures the collision detection always picks the guest nearest to the actual pointer, not the dragged item's bounding box. No other changes needed -- the existing `handleDragOver` and `handleDragEnd` logic already correctly handle above/below positioning and insertion.

### Result

- Dragging the last guest to the very top will correctly identify the first guest as the target
- The purple indicator will show above the first guest
- The guest will drop into position 1
- Works for all tables, all positions, and all future implementations

