

## Fix Individuals / Couples / Families Calculation

### Current Issue
The calculation in `src/components/Dashboard/GuestListTable.tsx` (lines 1153-1187) groups guests by their `family_group` field. However, there is a bug:

- Guests with **no** `family_group` are counted as Individuals (correct)
- Groups of **2** members are counted as Couples (correct)
- Groups of **3+** members are counted as Families (correct)
- Groups of **1** member (a guest assigned to a family group name but alone in that group) are **not counted at all** -- they fall through and appear in none of the three categories

### Fix
In the `familyGroups.forEach` loop, add a condition: if a family group has exactly 1 member, count that person as an Individual (since they are effectively alone).

### File to Modify
- `src/components/Dashboard/GuestListTable.tsx` (lines 1177-1184)

### Change Detail
Update the `familyGroups.forEach` block from:

```
if (members.length === 2) {
  stats.couple++;
} else if (members.length >= 3) {
  stats.family++;
}
```

To:

```
if (members.length === 1) {
  stats.individual++;
} else if (members.length === 2) {
  stats.couple++;
} else if (members.length >= 3) {
  stats.family++;
}
```

This ensures every guest is accounted for in exactly one category. No other files or pages are changed.
