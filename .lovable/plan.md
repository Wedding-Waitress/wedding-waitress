

## Polish: Party Member Rows in Add Guest Modal

### Changes (all in one file)

**File: `src/components/Dashboard/AddGuestModal.tsx`**

**1. Reduce row height and spacing**

- Line 1364: Change `space-y-2` to `space-y-1` (less gap between rows)
- Line 1366: The row already uses `py-1 px-2` which is compact. We'll keep `py-0.5` to make it slightly shorter while still readable.

**2. Make member names purple**

- Line 1368: Change `text-sm` to `text-sm text-primary` so names display in the brand purple color.

### Summary of style changes

| Property | Before | After |
|---|---|---|
| Gap between rows | `space-y-2` (8px) | `space-y-1` (4px) |
| Row vertical padding | `py-1` (4px each side) | `py-0.5` (2px each side) |
| Name text color | default (black) | `text-primary` (brand purple) |

No logic changes -- purely visual adjustments to the party member list inside the Add Guest modal.

