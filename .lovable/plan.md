

## Fix Page Glitch When Clicking Event Type / Partner Name Options

### Root Cause

The `handleRelationModeChange` function performs a **double database update**: first a direct `supabase.update()` call (line 352), then `updateEvent()` (line 363) which triggers another update and a full events refetch. This causes the component to re-render mid-operation, producing the visible glitch.

Similarly, the partner name radio label's `onClick` handler (line 1480) calls `handleSavePartnerNames()` which triggers yet another async DB call alongside multiple synchronous state changes, causing cascading re-renders.

### Fix

**File: `src/components/Dashboard/GuestListTable.tsx`**

1. **`handleRelationModeChange` (lines 342-378)**: Remove the redundant direct `supabase.update()` call. Keep only the `updateEvent()` call which already handles the DB update and state sync. Wrap the entire body in a `try/catch` for error handling.

2. **Partner name radio `onClick` (lines 1480-1487)**: Wrap the handler logic in a `try/catch` to prevent unhandled async errors from crashing the page. Also avoid calling `handleSavePartnerNames()` directly from the click -- instead, just set local state and let the save happen explicitly (or debounce it).

### Technical Details

- In `handleRelationModeChange`: remove lines 352-357 (the direct supabase call) and keep only `updateEvent(selectedEventId, { relation_mode: newMode })` inside the try block
- In the first radio label onClick (line 1480-1487): wrap in try/catch and avoid the immediate `handleSavePartnerNames()` call which races with state updates -- the default names "Bride"/"Groom" are already set via `setPartner1Name`/`setPartner2Name`, so the save can happen after state settles
- Add `isLoading` guards to prevent double-clicks during async operations

