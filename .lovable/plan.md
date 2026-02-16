

## Fix Sort By Dropdown in Guest List

### The Problem
The "Sort By" dropdown has no effect because the table renders from `groupedGuests` (which always sorts by first name A-Z), not from `sortedGuests` (which correctly handles all sort options). The two are independent -- `sortedGuests` is only used for CSV export and selection, while `groupedGuests` drives the actual table display.

### The Fix
Modify the `groupedGuests` `useMemo` in `GuestListTable.tsx` (around lines 579-633) to use the same sort logic from `sortBy` instead of the hardcoded first-name-only sort.

### Changes (single file: `GuestListTable.tsx`)

**1. Replace the hardcoded sort inside `groupedGuests`**

Currently at line 590-593, guests are always sorted by first name:
```tsx
const allSortedGuests = [...guests].sort((a, b) => {
  const firstA = a.first_name?.toLowerCase() || '';
  const firstB = b.first_name?.toLowerCase() || '';
  return firstA.localeCompare(firstB);
});
```

This will be replaced with the full sort logic from `sortBy` (the same switch/case already used in the `sortedGuests` memo at lines 679-737), so that the grouping respects the selected sort option.

**2. Add `sortBy` to the `groupedGuests` dependency array**

Currently (line 633): `[guests, searchTerm]`
Updated to: `[guests, searchTerm, sortBy, tables, selectedEvent]`

This ensures the grouped view re-computes when the sort option changes.

**3. Sort groups themselves based on sort criteria**

After grouping, the family/couple groups will also be ordered based on the sort option. For example, sorting by "Last Name (A-Z)" will order the Elfil family before the Saad family, and members within each group will also be sorted by last name.

### What This Fixes
All sort options from the dropdown will now work:
- First Name (A-Z / Z-A)
- Last Name (A-Z / Z-A)
- Table (A-Z / Z-A)
- Seat No. (1-9)
- RSVP (Attending first / Not Attending first)
- Relation (A-Z / Z-A)
- Family/Group (A-Z / Z-A)

### What Is NOT Changed
- No UI or styling changes
- No changes to the sort dropdown menu itself
- No changes to the `sortedGuests` memo (used for export/selection)
- No changes to group header rendering or row rendering

