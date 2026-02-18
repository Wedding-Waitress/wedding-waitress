

## Fix Table Sort Option

### Changes

**1. Rename "Table" to "Table No." in the Sort By dropdown**

In `src/components/Dashboard/GuestListTable.tsx`, update the `SORT_OPTIONS` array entry from:
```
{ value: 'table_name', label: 'Table' }
```
to:
```
{ value: 'table_name', label: 'Table No.' }
```

**2. Verify table sorting logic**

The current sorting logic for the Table option already:
- Places named tables (text names like "Bridal Table", "Bride's Parents 2", "Groom's Parents 1") first, sorted alphabetically
- Places numbered tables (Table 1, Table 2, etc.) after, sorted numerically
- Guests with no table assigned sort to the bottom

The `getTableName` function correctly looks up the table name from the `tables` array using each guest's `table_id`. If only "Groom's Parents 1" guests appeared when you clicked Table, it is likely because only that named table currently has guests assigned to it. "Bridal Table" and "Bride's Parents 2" may exist as tables but have no guests assigned yet. The sort only displays guests that exist in the guest list -- it cannot show empty tables.

After renaming, please re-test by assigning at least one guest to each named table, then clicking "Table No." to confirm all named-table guests appear at the top in alphabetical order.

### Technical detail

**File: `src/components/Dashboard/GuestListTable.tsx`**

- Line ~111: Change `label: 'Table'` to `label: 'Table No.'`

Single-line change only.
