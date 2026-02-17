

## Center and Balance the Three Onboarding Boxes

### What Changes

The three inner boxes (Choose Event, Type of Event, Guest Relations) will become equal width, properly centered within the Guest List container, with matching gaps on the left and right edges.

### Technical Details

**File**: `src/components/Dashboard/GuestListTable.tsx` (line 1377)

**Current**:
```
<div className="flex flex-col md:flex-row gap-4 pr-1">
```

**New**:
```
<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
```

Changes:
1. Replace `flex flex-col md:flex-row` with `grid grid-cols-1 md:grid-cols-3` -- CSS Grid with `repeat(3, minmax(0, 1fr))` guarantees all three boxes are exactly equal width
2. Remove `pr-1` -- this extra right padding was causing the third box to sit too close to the right edge; without it, the parent Card's symmetric `p-4 md:p-6` padding creates identical left and right gaps
3. Increase gap from `gap-4` (16px) to `gap-5` (20px) for better spacing between boxes
4. Remove `flex-1` from each of the three child box divs (grid handles sizing automatically)

No other elements, styles, or functionality will be changed.

