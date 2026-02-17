

## Fix: Table Number Repeated in Add Guest Dropdown

### Problem

Tables with just a number (e.g., table 3) are displaying as "Table 3 - 3" because the `name` field stores the number as text (e.g., `"3"`). The current logic appends ` - {name}` whenever `name` exists, causing the number to appear twice.

### Fix (1 file, 1 line)

**`src/components/Dashboard/AddGuestModal.tsx` (line 991)**

Add a check: only append the name after the hyphen if it is different from the table number.

```tsx
// Before
{table.table_no ? `Table ${table.table_no}${table.name ? ` - ${table.name}` : ''}` : table.name}

// After
{table.table_no
  ? `Table ${table.table_no}${table.name && table.name !== String(table.table_no) ? ` - ${table.name}` : ''}`
  : table.name}
```

### Result

- Table with number 3 and name "3" shows: **Table 3**
- Table with number 1 and name "Groom's Parents" shows: **Table 1 - Groom's Parents**
- Table with no number and name "Bridal Table" shows: **Bridal Table**

