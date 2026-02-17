
## Fix Three-Box Layout with CSS Grid

### What Changes

The three onboarding boxes (Choose Event, Type of Event, Guest Relations) will be made equal width with symmetric left/right gaps inside the Guest List container.

### Technical Details

**File**: `src/components/Dashboard/GuestListTable.tsx` (line 1377)

**Current**:
```
<div className="flex flex-col md:flex-row gap-4 pr-1">
```

**New**:
```
<div className="flex flex-col md:grid md:grid-cols-3 gap-4">
```

Two changes:
1. Replace `md:flex-row` with `md:grid md:grid-cols-3` -- uses `grid-template-columns: repeat(3, minmax(0, 1fr))` to guarantee exactly equal-width columns
2. Remove `pr-1` -- the parent Card already has symmetric padding (`p-4 md:p-6`), so the extra right padding was causing the third box to sit too close to the right edge

No other files or elements are changed.
