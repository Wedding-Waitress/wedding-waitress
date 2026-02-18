

## Fix: Drag Behavior and Spacing on Tables Page

### Problem 1: Too much gap between drop indicator and guests
The guest list uses `space-y-2` (8px gap) between items. During a drag, this creates visible separation between the purple indicator line and surrounding items.

**Fix:** Reduce the gap from `space-y-2` to `space-y-1` (4px) in `TableGuestList.tsx`.

### Problem 2: Dragged guest should move with the cursor, not leave a ghost behind
Currently, when you drag a guest:
- The original stays in place at 30% opacity (ghost)
- A separate overlay copy floats with your cursor

You want: the dragged item itself disappears from the list and moves with your cursor -- no ghost left behind.

**Fix in `SortableGuestItem.tsx`:**
- When `isDragging` is true, hide the item completely (`opacity: 0, height: 0, margin: 0, overflow: hidden`) instead of showing it at 30% opacity. This collapses the gap and removes the ghost.

### Files to change

**1. `src/components/Dashboard/Tables/SortableGuestItem.tsx`**
- Change the dragging style from `opacity: 0.3` to fully hidden: `opacity: 0, height: 0, overflow: 'hidden', padding: 0, margin: 0, border: 'none'`

**2. `src/components/Dashboard/Tables/TableGuestList.tsx`**
- Change `space-y-2` to `space-y-1` for tighter spacing between guest rows

### Result
- The dragged guest vanishes from its original spot (no ghost)
- The overlay copy follows your cursor showing exactly where it will land
- The purple indicator line sits right next to the neighboring guests with minimal gap
- Drop behavior and seat numbering remain unchanged
