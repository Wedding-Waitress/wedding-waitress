

## Remove "Seat No." Sort Option from Guest List

### What Changes

Remove the "Seat No. (1->9)" option from the Sort By dropdown menu. This involves removing it from three places in `GuestListTable.tsx`:

1. **Type definition** (line 104): Remove `'seat_no_asc' | 'seat_no_desc'` from the SortOption type
2. **Dropdown options array** (line 116): Remove the `{ value: 'seat_no_asc', label: 'Seat No. (1→9)' }` entry
3. **Sort logic in `groupedGuests`** (lines 610-611): Remove the `case 'seat_no_asc'` branch
4. **Sort logic in `sortedGuests`** (lines 750-751): Remove the duplicate `case 'seat_no_asc'` branch

### What Is NOT Changed
- The "Seat No." column in the table remains visible
- No UI or styling changes
- All other sort options remain intact
- No other files are modified

