

## Plan: Red border for over-capacity tables

### Change (in `src/components/Dashboard/TableCard.tsx`)

Update the border logic on line 152-155 to distinguish between "exactly full" (green border) and "over capacity" (red border):

```tsx
const isOverCapacity = table.guest_count > table.limit_seats;

// In the className:
isOverCapacity
  ? 'border-4 border-red-500'
  : isFull
    ? 'border-4 border-green-500'
    : 'border-2 border-primary'
```

This means:
- **Over capacity** (e.g., 11/10): Red border + red "Over by +1" banner (already exists)
- **Exactly full** (e.g., 10/10): Green border + green "Full Table" banner (existing)
- **Under capacity**: Purple border (existing)

Single file change, ~3 lines modified.

