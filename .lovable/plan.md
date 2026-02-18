

## Fix: Allow Dropping at Index 0 (Seat 1) in Table Guest Lists

### The Problem

When dragging a guest to the top of a table's guest list (above the first guest), the collision detection returns the **table container** instead of the first guest. Both the cross-table move and same-table reorder code paths treat a table-container drop as "insert at end," so the guest always ends up at the last position -- never at Seat 1.

### Root Cause

Two code paths in `SortableTablesGrid.tsx` assume table-container drops mean "append to end":

1. **Cross-table move (line 338-343):** `insertAtIndex = destTableGuests.length` -- always end
2. **Same-table reorder (line 416-418):** `targetIndex = tableGuests.length - 1` -- always end

### The Fix

**File: `src/components/Dashboard/Tables/SortableTablesGrid.tsx`**

When a drop lands on a **table container** (not a specific guest), check the pointer's Y position against the first guest in that table:

- If the pointer is **above** the first guest's midpoint, insert at index 0 (Seat 1)
- Otherwise, insert at the end (current behavior)

This applies to both locations:

**1. Cross-table move (lines 338-343):**

After getting `destTableGuests`, sort them by seat number, find the first guest's DOM element, compare `pointerPositionRef.current.y` against its midpoint. If above, set `insertAtIndex = 0`; otherwise keep `insertAtIndex = destTableGuests.length`.

**2. Same-table reorder (lines 416-418):**

Same logic: check if pointer is above the first guest in the sorted table list. If so, `targetIndex = 0` (adjusted for arrayMove); otherwise `targetIndex = tableGuests.length - 1`.

### What Does Not Change

- Collision detection algorithm stays the same
- Guest-to-guest drop logic (above/below indicators) stays the same
- Unassigned panel behavior stays the same
- All other drag-and-drop functionality stays the same

