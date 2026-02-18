

## Make All Four Onboarding Boxes Equal in Width and Height

### What Changes

All four boxes (Choose Event, Type of Event, Guest Relations, Let the fun begin) will become identical in width and height by switching to a uniform 4-column grid with equal sizing.

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Step 1 -- Change grid to equal 4 columns (line 1405)**
- Update from `grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-start`
- To `grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch`
- `md:grid-cols-4` gives all four boxes equal width
- `items-stretch` (replacing `items-start`) forces all boxes to match the tallest box's height

**Step 2 -- No other changes needed**
- The individual box styling already uses consistent border/padding patterns
- The `items-stretch` property will handle equal heights automatically via CSS Grid

