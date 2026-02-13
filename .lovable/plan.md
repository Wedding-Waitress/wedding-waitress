

## Two Changes to Guest List Page Layout

### Change 1: Move "Hide what the guest relation is to you" toggle inline with the heading

Currently the toggle and label sit at the bottom of the third box as a separate row (lines 1442-1451). Move this toggle and its label to sit on the same line as the "Add what relation each guest is to both of you:" heading, to the right of that text.

**Lines 1363-1368** currently:
```
<div className="flex items-center gap-3 mb-3">
  {totalGuestCount === 0 && (
    <span ...>3rd</span>
  )}
  <span ...>Add what relation each guest is to both of you:</span>
</div>
```

Restructure to include the toggle inline:
```
<div className="flex items-center gap-3 mb-3 flex-wrap">
  {totalGuestCount === 0 && (
    <span ...>3rd</span>
  )}
  <span ...>Add what relation each guest is to both of you:</span>
  <div className="flex items-center gap-2 ml-auto">
    <Switch ... />
    <Label ...>Hide what the guest relation is to you</Label>
  </div>
</div>
```

Then remove the original toggle block at lines 1442-1451.

### Change 2: Add spacing gap between the config boxes and the stats/buttons row

At line 1454 (after the closing `</div>` of the two boxes), the next element is the stats/buttons bar at line 1458. There is no margin between them. Add `mt-4` to the stats bar container (line 1458), changing:
```
<div className="flex flex-col sm:flex-row ...">
```
to:
```
<div className="flex flex-col sm:flex-row ... mt-4">
```

### Files Modified
- `src/components/Dashboard/GuestListTable.tsx` only

