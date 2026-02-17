
## Fix: Stale Table Guest Counts in Add Guest Modal

### Problem

The "Add Guest" modal has its own `useTables(eventId)` hook instance that only fetches table data on mount and when `eventId` changes. When you add guests and reopen the modal, it still shows the old guest counts (e.g., "1/10" instead of "2/10" for table 8).

### Solution

Extract `fetchTables` from the modal's `useTables` hook and trigger a refetch every time the modal opens.

### Changes (1 file)

**`src/components/Dashboard/AddGuestModal.tsx`**

1. Destructure `fetchTables` from the `useTables` hook (line 102):
   - Change `const { tables } = useTables(eventId);` to `const { tables, fetchTables } = useTables(eventId);`

2. Add a `useEffect` that calls `fetchTables()` when the modal opens:
```typescript
useEffect(() => {
  if (isOpen && eventId) {
    fetchTables();
  }
}, [isOpen, eventId]);
```

This ensures the table dropdown always shows accurate guest counts every time the modal is opened, regardless of how many guests were added since the last fetch.
