

## Fix: Seat 1 Drop Not Working — Broken DOM Element Lookup

### Why It Keeps Failing

Every previous attempt modified the drop handler logic, but the real bug is one level earlier: the system **cannot find the guest element in the DOM**.

In `handleDragOver`, this line runs every time you hover over a guest:

```ts
const el = document.getElementById(String(over.id));
```

But the guest component (`SortableGuestItem.tsx`) never puts an `id` attribute on its outer `<div>`. So `el` is always `null`, and the code defaults the hover position to `'below'` instead of calculating it from the pointer.

This means hovering above the first guest registers as "below the first guest," producing index 1 (Seat 2) instead of index 0 (Seat 1).

### The One-Line Fix

**File: `src/components/Dashboard/Tables/SortableGuestItem.tsx` (line 72)**

Add `id={guest.id}` to the outer `<div>`:

```tsx
// Before
<div ref={setNodeRef} style={style} className="relative group" ...>

// After
<div ref={setNodeRef} id={guest.id} style={style} className="relative group" ...>
```

That is the entire fix. No changes to `SortableTablesGrid.tsx` needed -- the drop handler logic already correctly handles index 0 when `savedPosition` is `'above'`.

### Why This Works

1. `document.getElementById(guest.id)` now finds the element
2. `getBoundingClientRect()` returns real coordinates
3. Pointer Y vs midpoint correctly determines `'above'` or `'below'`
4. When above the first guest: `savedPosition = 'above'`, `overIndex = 0`, so `insertAtIndex = 0` (Seat 1)

### What Does Not Change

- No changes to collision detection
- No changes to the drop handler
- No changes to any other drag-and-drop behavior
- All existing seat 2-through-N ordering continues to work

