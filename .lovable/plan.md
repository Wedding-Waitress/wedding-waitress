

## Fix: Guest Always Drops Second From Top (Stale Closure Bug)

### Root Cause

The `overGuestPosition` state variable (which tracks whether the indicator is "above" or "below") is used inside `handleDragEnd` to decide where to insert the guest. However, `handleDragEnd` is wrapped in `useCallback` and `overGuestPosition` is **not listed in its dependency array**. This means the function captures a stale (old) value of `overGuestPosition` -- it never sees the latest "above" value, so it always defaults to "below" and inserts one position too low.

### Solution

Store `overGuestPosition` in a **ref** (`overGuestPositionRef`) in addition to state. The ref always holds the current value and doesn't suffer from stale closures. `handleDragEnd` will read from the ref instead of the state variable.

### Changes (1 file)

**`src/components/Dashboard/Tables/SortableTablesGrid.tsx`**

1. Add `overGuestPositionRef = useRef<'above' | 'below' | null>(null)` alongside the existing state
2. Whenever `setOverGuestPosition(value)` is called, also set `overGuestPositionRef.current = value` (in `handleDragOver` and the reset in `handleDragEnd`)
3. In `handleDragEnd`, replace all reads of `overGuestPosition` with `overGuestPositionRef.current` (lines 354 and 392)

### Why This Works

- A ref is not bound by closure rules -- reading `.current` always gives the latest value
- No need to add `overGuestPosition` to the dependency array (which would cause unnecessary re-creation of the callback on every pointer move)
- The state variable is still used for rendering the indicator in the UI; only the drop logic switches to the ref

### Technical Detail

```text
Before (broken):
  handleDragEnd reads overGuestPosition from closure
  -> closure captured value from last useCallback creation
  -> dependency array doesn't include overGuestPosition
  -> value is stale (null or "below")
  -> guest always inserts at overIndex + 1 (second position)

After (fixed):
  handleDragEnd reads overGuestPositionRef.current
  -> ref always has the latest value set by handleDragOver
  -> correctly reads "above" when pointer is in top half
  -> guest inserts at overIndex (first position)
```

