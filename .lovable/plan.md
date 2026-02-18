

## Replace Sort By Options in Guest List

### What changes

Remove all 7 current sort options and replace with 6 new simplified options. The first three sort all guests alphabetically by the chosen field (A-Z). The last three reorder groups so that the selected group type (Individuals, Couples, or Families) appears first, with everything else following alphabetically.

### New Sort Options (top to bottom)

| Label | Behavior |
|---|---|
| First Name | Sort all guests by first name A-Z |
| Last Name | Sort all guests by last name A-Z |
| Table | Sort all guests by table name A-Z |
| Individuals | Show individual guests first, then couples, then families |
| Couples | Show couples first, then individuals, then families |
| Families | Show families first, then couples, then individuals |

### File: `src/components/Dashboard/GuestListTable.tsx`

**1. Replace the `SortOption` type (lines 104-108)**

```
type SortOption =
  | 'first_name' | 'last_name' | 'table_name'
  | 'individuals_first' | 'couples_first' | 'families_first';
```

**2. Replace the `SORT_OPTIONS` array (lines 110-118)**

```
const SORT_OPTIONS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'table_name', label: 'Table' },
  { value: 'individuals_first', label: 'Individuals' },
  { value: 'couples_first', label: 'Couples' },
  { value: 'families_first', label: 'Families' },
] as const;
```

**3. Update default sort state (line 177)**

Change default from `'first_name_asc'` to `'first_name'`.

**4. Update sorting logic in `groupedGuests` memo (lines 639-663)**

- `first_name`: sort by first name A-Z
- `last_name`: sort by last name A-Z
- `table_name`: sort by table name A-Z
- `individuals_first`, `couples_first`, `families_first`: sort by first name A-Z (the group ordering is applied after grouping)

**5. Add group-type ordering (after line 706)**

For `individuals_first`, `couples_first`, and `families_first`, sort the `groups` array so the selected type appears first. For example, `families_first` orders: families, then couples, then individuals.

**6. Update `sortedForExport` memo (lines 755-775)**

Mirror the same sorting logic changes (remove old cases, add new ones).

**7. Update `handleSortChange` and localStorage fallback**

Ensure saved sort preferences using old keys (e.g., `first_name_asc`) gracefully fall back to `first_name`.

