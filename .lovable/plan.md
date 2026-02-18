

## Add Fourth Onboarding Box and Reorganize Layout

### What Changes

1. The current 3-column grid of onboarding boxes will remain as 3 equal-width, equal-height boxes (1, 2, 3).
2. A **fourth box** will be added to the right, on a new row or as a smaller box beside the grid, containing:
   - The green circle with **"4"** (moved from its current position next to the Add Guest button)
   - A heading: **"Let the fun begin! Now start adding your guest list here."**
   - A green "Add Guest" button below the heading
3. The green "4" circle currently next to the Add Guest button in the control bar will be **removed** from there (since it moves into Box 4).
4. The Add Guest button in the control bar will remain as-is (without the "4" circle).

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**Step 1 -- Add Box 4 after the 3-column grid (after line 1428 area, after the closing `</div>` of the grid)**

Add a new flex row below the grid containing a smaller fourth box:

```tsx
<div className="flex justify-end mt-4">
  <div className="border-2 border-[#7248E6] rounded-lg p-4 inline-flex flex-col items-start gap-3">
    <div className="flex items-center gap-2">
      <span className="bg-green-500 text-white font-bold text-sm w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0">4</span>
      <span className="text-sm font-semibold text-primary">Let the fun begin! Now start adding your guest list here.</span>
    </div>
    <Button
      variant="default"
      size="sm"
      onClick={handleAddGuest}
      className="bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center gap-2"
    >
      <Users className="w-4 h-4" />
      Add Guest
    </Button>
  </div>
</div>
```

This box will be right-aligned and only as large as its content (heading + button), making it visually smaller than boxes 1-3.

**Step 2 -- Remove the "4" circle from the control bar (line 1740)**

Delete the `<span>` with the green "4" circle that currently sits next to the Add Guest button in the search/filter bar.

**Step 3 -- Ensure boxes 1, 2, 3 are equal width and height**

The existing `grid grid-cols-1 md:grid-cols-3 gap-4` already makes them equal width. To ensure equal height, the grid items already stretch by default (CSS Grid behavior). No changes needed here.

