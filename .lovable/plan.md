

# Update Guest List "Sort By" and "Import/Export CSV" Buttons

## What's changing

The "Sort By" and "Import / Export CSV" buttons on the Guest List page currently use `variant="default" size="xs"` (solid purple background). They need to be updated to match the Running Sheet's green-bordered tablet style.

## Technical Details

**File:** `src/components/Dashboard/GuestListTable.tsx`

### Sort By button (lines 1651-1660)
- Replace `variant="default" size="xs" className="rounded-full flex items-center gap-2"` with the green-bordered style:
  `className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"`
- Change icon sizes from `w-4 h-4` to `w-3 h-3`

### Import/Export CSV button (lines 1692-1700)
- Same styling change as above
- Change icon sizes from `w-4 h-4` to `w-3 h-3`

Both buttons will switch from a raw `<Button>` component to a plain `<button>` element (or override styles) to exactly match the Running Sheet buttons.

## Files Modified
- `src/components/Dashboard/GuestListTable.tsx`

