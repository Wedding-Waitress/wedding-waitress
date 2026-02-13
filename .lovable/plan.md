

## Update Green Circle Badges and Box Layout

### Changes Summary
Four modifications to `src/components/Dashboard/GuestListTable.tsx`:

### 1. Double the size of all three green circles
Change from `w-8 h-8 text-lg` to `w-16 h-16 text-2xl` on lines 1278, 1321, and 1365.

### 2. Move "Type of Event" title to the right of the 2nd circle
Currently the 2nd badge is in its own `div` above the title. Restructure so the badge and title sit side by side using a flex row container.

**Lines 1319-1327** -- combine the badge and the "Type of Event" heading into one horizontal flex row:
```
<div className="flex items-center gap-3 mb-3">
  {totalGuestCount === 0 && (
    <span className="bg-green-500 text-white font-normal text-2xl w-16 h-16 rounded-full inline-flex items-center justify-center shrink-0">2nd</span>
  )}
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold text-primary">Type of Event:</span>
    <span className="text-xs text-muted-foreground">(Two people or single person event)</span>
    {/* saved indicator stays here */}
  </div>
</div>
```

### 3. Change 3rd box text and move it beside the circle
Change wording from "Add what relation your guests are to each of you:" to "Add what relation each guest is to both of you:"

Restructure lines 1363-1370 so the 3rd badge and heading sit side by side, same pattern as box 2.

### 4. Make both boxes equal width
Add `flex-1` to both box containers (lines 1318 and 1362) so they share equal width.

### Files Modified
- `src/components/Dashboard/GuestListTable.tsx` only

