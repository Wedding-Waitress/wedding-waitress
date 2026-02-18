

## Fix: overGuestPositionRef Cleared Before Being Read

### Problem

Every previous fix has been undermined by one line: at the very start of `handleDragEnd` (line 301), `overGuestPositionRef.current` is reset to `null` **before** the code reads it at lines 365 and 403. So the position is always `null`, never `'above'` or `'below'`, and the guest never lands at the top.

### Solution

Save the ref value into a local variable at the top of `handleDragEnd`, **before** clearing it.

### Changes (1 file)

**`src/components/Dashboard/Tables/SortableTablesGrid.tsx`** -- `handleDragEnd` function

1. At line 293 (right after destructuring `active` and `over`), add:
```
const savedPosition = overGuestPositionRef.current;
```

2. Line 301 stays as-is (clearing the ref is fine after we saved).

3. Replace `overGuestPositionRef.current` with `savedPosition` on:
   - Line 365: `if (savedPosition === 'above')`
   - Line 403: `if (savedPosition === 'above')`

That is the entire fix -- three lines changed.

