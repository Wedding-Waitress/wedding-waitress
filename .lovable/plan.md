

## Resize Box 4 to Half Width

### What Changes

Box 4 ("Let the fun begin!") will be reduced to roughly half the width of boxes 1-3, while boxes 1-3 grow slightly to fill the freed space. All four boxes will remain the same height.

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Single change on line 1405:**
- Update from `md:grid-cols-4` to `md:grid-cols-[2fr_2fr_2fr_1fr]`
- This gives boxes 1-3 double the width of box 4, making box 4 approximately half the size
- `items-stretch` remains to keep all heights equal

