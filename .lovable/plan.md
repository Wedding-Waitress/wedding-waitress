
## Fix: Cannot Drag Guest to Top Position Within Same Table

### Problem

When you drag a guest (e.g., Dylan at seat 2) upward to place above the first guest (Ken at seat 1), nothing happens -- Dylan stays at seat 2. This also affects dragging from lower positions to the very top of any table.

### Root Cause

The collision detection does **not exclude the dragged guest** from its results. When you drag Dylan upward, `closestCenter` often returns **Dylan's own droppable element** (still in the DOM at his original position) as the "closest" target. In `handleDragEnd`, this means `over.id === active.id`, so the code computes `overIndex === oldIndex`, sees no change, and exits early -- the guest never moves.

### Solution

Add one line to the collision detection filter (line 181) to exclude the active/dragged guest from the results. This ensures the system always finds the **nearest other guest** as the drop target.

### Changes (1 file)

**`src/components/Dashboard/Tables/SortableTablesGrid.tsx`**

In the `collisionDetection` callback, at line 181 where `guestsOnThisTable` is filtered, add a check to skip the active guest:

```
const guestsOnThisTable = allClosest.filter(c => {
  if (c.id === args.active.id) return false;  // <-- NEW: exclude dragged guest
  const dc = args.droppableContainers.find(d => d.id === c.id);
  return (
    dc?.data?.current?.type === 'guest' &&
    dc?.data?.current?.guest?.table_id === tableId
  );
});
```

### Why This Works

- Currently: dragging Dylan above Ken → `closestCenter` returns Dylan himself → `over === active` → no reorder
- After fix: dragging Dylan above Ken → Dylan filtered out → `closestCenter` returns Ken → position calculated as "above" → `arrayMove(1, 0)` → Dylan moves to seat 1

### No Other Changes Needed

The existing `handleDragOver` midpoint logic and `handleDragEnd` reorder logic are correct. The only issue is that the wrong guest (the dragged guest itself) is being selected as the collision target.
