

## Fix: Guests Not Appearing on Tables Page After Adding on Guest List Page

### Problem

When guests are added via the Guest List page and assigned to a table, they do not appear on the Tables page. This happens because:

1. Both pages use separate instances of `useRealtimeGuests` subscribing to the same Supabase Realtime channel
2. When switching from Guest List to Tables tab, the `eventId` hasn't changed, so the hook does not re-fetch
3. Realtime events can be missed when two channel instances with the same name compete

### Fix (1 file)

**`src/pages/Dashboard.tsx`** -- line ~607

When the user navigates to the `table-list` tab, also trigger a guest refetch alongside the existing event refetch. The `refetchGuests` function is already returned by `useRealtimeGuests` but is not currently destructured in Dashboard.tsx.

### Technical Steps

1. Destructure `refetchGuests` from `useRealtimeGuests` (line ~110-115):
   ```tsx
   const {
     guests,
     loading: guestsLoading,
     moveGuest,
     reorderGuestsWithSeats,
     refetchGuests   // <-- add this
   } = useRealtimeGuests(selectedEventId);
   ```

2. Call `refetchGuests()` in `handleTabChange` when switching to `table-list` (line ~607):
   ```tsx
   if (tabId === 'table-list') {
     refetchEvents();
     refetchGuests();  // <-- add this
   }
   ```

### Result

Switching to the Tables tab will always show the latest guest assignments, even if realtime events were missed while on another tab.
