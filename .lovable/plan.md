

## Fix: Duplicate Table Names in Add Guest Modal Dropdown

### Problem

In the "Select Table" dropdown inside the Add Guest modal, each table entry is shown twice separated by a hyphen. For example:
- "One, Groom's Parents - One, Groom's Parents"
- "2 Brides Parents - 2 Brides Parents"

### Cause

Line 991 of `AddGuestModal.tsx` currently renders:

```
{table.table_no ? `Table ${table.table_no}` : table.name} - {table.name}
```

This always appends `- {table.name}` after the initial display, causing duplication.

### Fix (1 file, 1 line)

**`src/components/Dashboard/AddGuestModal.tsx` (line 991)**

Change the display logic to show each table only once:
- If the table has a number AND a name: show `Table {number} - {name}`
- If the table has only a number: show `Table {number}`
- If the table has only a name: show the name

```tsx
// Before
{table.table_no ? `Table ${table.table_no}` : table.name} - {table.name}

// After
{table.table_no ? `Table ${table.table_no}${table.name ? ` - ${table.name}` : ''}` : table.name}
```

