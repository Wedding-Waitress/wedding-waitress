

## Updated Sort By Rules for Guest List

### Summary

Update the sorting behavior for all 6 Sort By options with specific rules for each.

### Sorting Rules

**First Name, Last Name, Table** -- These three options will "flatten" the guest list, breaking apart couples and families so every guest appears as an individual row sorted purely by the chosen field (A-Z).

**Table** has a special sub-rule: tables with text names (e.g., "Bridal Table", "Bride's Family") appear first alphabetically, followed by numbered tables (Table 1, 2, 3...) in numeric order.

**Individuals, Couples, Families** -- These three options keep guests grouped. The selected type appears at the top, followed by the other two types in the specified order. Within each type section, groups are sorted alphabetically by the primary last name (surname) of the group. For couples/families, this is the last name of the first member; for individuals, it is their own last name.

| Option | Order |
|---|---|
| Individuals | Individuals, then Couples, then Families |
| Couples | Couples, then Families, then Individuals |
| Families | Families, then Couples, then Individuals |

### Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

**1. Flatten groups for First Name / Last Name / Table sorts (lines 665-696)**

When `sortBy` is `first_name`, `last_name`, or `table_name`, skip the family grouping logic entirely. Instead, treat every guest as an individual group of one. This breaks apart couples and families so they appear as separate rows sorted purely by the chosen field.

**2. Update Table sort comparator (lines 642-645)**

Improve the table name sorting to put text-named tables before numbered tables:
- Extract any trailing number from the table name
- If both tables are purely numeric (e.g., "Table 1" vs "Table 5"), sort numerically
- If one is named and one is numbered, the named one comes first
- If both are named, sort alphabetically

**3. Update group-type ordering to sort by last name within each type (lines 698-708)**

After sorting groups by type priority, add a secondary sort within each type by the last name of the first member (or the group's primary surname). This ensures that when "Families" is selected, all family groups appear sorted alphabetically by surname, then all couple groups sorted by surname, then all individuals sorted by surname.

**4. Mirror changes in `sortedForExport` memo (lines 757-773)**

Apply the same table-sort logic improvement to the export sorting function.

