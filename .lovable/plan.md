

## Fix: Guests Moving to Wrong Table During Drag-and-Drop

### Problem

The collision detection algorithm in `SortableTablesGrid.tsx` uses `closestCenter` across **all guests globally**. When you drag a guest toward table 10, the algorithm finds the nearest guest by geometric center point -- which might be a guest on table 5. Since `handleDragEnd` uses `overData.guest.table_id` as the destination, the guest lands on the wrong table.

### Root Cause

In the custom `collisionDetection` function (line 132-154):

```text
1. closestCenter runs against ALL droppable items
2. Guest collisions are prioritized over table collisions
3. The "closest guest" could be on any table, not just the one under the pointer
4. Result: guest goes to whatever table has the nearest guest center, not where you dropped
```

### Solution

Redesign the collision detection to be **table-aware**:

1. First, use `pointerWithin` to determine which **table container** the pointer is currently over
2. Then, among only the guests **within that table**, find the closest guest using `closestCenter`
3. If no guests are in that table (empty table), return the table container itself as the collision target

This ensures the destination is always the table the user is pointing at.

### Changes (1 file)

**`src/components/Dashboard/Tables/SortableTablesGrid.tsx`** -- Replace the `collisionDetection` function (lines 132-154)

New logic:

```text
Step 1: pointerWithin -> find all containers the pointer is inside
Step 2: Identify which table or unassigned zone the pointer is over
Step 3: Filter closestCenter results to only guests belonging to that table
Step 4: Return the filtered guest collision, or the table container if no guests match
```

### Technical Detail

```tsx
const collisionDetection: CollisionDetection = useCallback((args) => {
  // Step 1: Find which containers the pointer is within
  const pointerCollisions = pointerWithin(args);

  // Step 2: Identify the table/unassigned container under the pointer
  const tableCollision = pointerCollisions.find(c => {
    const container = args.droppableContainers.find(dc => dc.id === c.id);
    const type = container?.data?.current?.type;
    return type === 'table' || type === 'unassigned';
  });

  if (tableCollision) {
    const tableContainer = args.droppableContainers.find(
      dc => dc.id === tableCollision.id
    );
    const tableData = tableContainer?.data?.current;

    if (tableData?.type === 'table') {
      const tableId = tableData.tableId;

      // Step 3: Among closestCenter results, keep only guests on THIS table
      const allClosest = closestCenter(args);
      const guestsOnThisTable = allClosest.filter(c => {
        const dc = args.droppableContainers.find(d => d.id === c.id);
        return (
          dc?.data?.current?.type === 'guest' &&
          dc?.data?.current?.guest?.table_id === tableId
        );
      });

      if (guestsOnThisTable.length > 0) {
        return guestsOnThisTable;
      }
    }

    // No matching guests -- return the table/unassigned container
    return [tableCollision];
  }

  // Fallback
  return rectIntersection(args);
}, []);
```

### Result

- Dragging a guest to table 10 will always drop them on table 10, regardless of which other tables have guests nearby
- Within a table, positional insertion still works correctly (closest guest detection scoped to that table)
- Empty tables accept drops properly
- Unassigned zone still works

