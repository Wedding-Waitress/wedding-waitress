

## Remove Sort Options from Guest List Dropdown

### What changes

Remove 5 sort options from the "Sort By" dropdown on the Guest List page to simplify the menu.

### Options being removed

- RSVP (Attending -> Pending -> Not Attending)
- RSVP (Not Attending -> Pending -> Attending)
- Relation (A-Z)
- Relation (Z-A)
- Family/Group (Z-A)

### Options remaining after cleanup

- First Name (A-Z)
- First Name (Z-A)
- Last Name (A-Z)
- Last Name (Z-A)
- Table (A->Z)
- Table (Z->A)
- Family/Group (A-Z)

### File to change: `src/components/Dashboard/GuestListTable.tsx`

**1. Remove from `SortOption` type** -- Delete the union members: `'rsvp_attending_first'`, `'rsvp_not_attending_first'`, `'relation_asc'`, `'relation_desc'`, `'family_group_desc'`

**2. Remove from `SORT_OPTIONS` array** -- Delete those 5 entries from the array

**3. Remove corresponding sort logic** -- Clean up `switch/case` branches for the removed options in the two sorting functions (the `groupedGuests` memo and the `sortedForExport` memo)

No other files reference these sort values, so no additional changes needed.

