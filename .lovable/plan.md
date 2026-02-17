

## Hide "Relation" Field in Add Guest Modal When Relations Are Hidden

### What Changes

When the user toggles "Hide what the guest relation is to you" (turning it red), the Relation field in the "Add New Guest" modal should immediately disappear -- no delay, no stale data.

### Why It Might Not Be Working Now

The modal currently checks `selectedEvent.relation_mode` from the events cache, which updates via a realtime subscription. There can be a brief delay between toggling and the cache refreshing, causing the Relation field to still appear momentarily.

### Fix (2 files)

**1. `src/components/Dashboard/GuestListTable.tsx`**
- Pass the local `relationsHidden` state as a new prop to `AddGuestModal`

**2. `src/components/Dashboard/AddGuestModal.tsx`**
- Add an optional `relationsHidden` prop to the component interface
- Change the condition on the Relation field from `(selectedEvent as any)?.relation_mode !== 'off'` to use the new prop (falling back to the existing DB check if the prop is not provided)
- Also update the relation validation logic (around line 422) to skip validation when `relationsHidden` is true

This ensures the Relation field hides instantly based on the parent's local state, with no dependency on realtime refresh timing.
