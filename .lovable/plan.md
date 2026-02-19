

# Fix: "Failed to add guest" Error

## What's Happening

The error in the console is: `duplicate key value violates unique constraint "uniq_guest_name_per_event"`. This means guests with the exact same first + last name combination already exist in your event's guest list. This can happen if:

1. A previous attempt partially succeeded (the main guest or some members were saved before the error)
2. You already have guests with those names in the list

The current code only catches the "seat taken" duplicate error but does **not** handle the "duplicate name" case, so it falls through to the generic "Failed to add guest" message.

## The Fix

Two changes to `src/components/Dashboard/AddGuestModal.tsx`:

### 1. Handle the duplicate name constraint error gracefully
Add a specific check for the `uniq_guest_name_per_event` constraint (alongside the existing `uniq_event_table_seat` check) so the user gets a clear message like **"A guest with this name already exists in this event."** instead of the generic error.

### 2. Fix the race condition in relation assignment completion
The `onComplete` callback calls `setPartyMembers(...)` to attach `_relation` data, then immediately calls `onSubmit(updatedData)`. Since React batches state updates, `partyMembers` won't have the `_relation` data when `onSubmit` reads it. Fix this by passing the updated members directly instead of relying on state.

## Technical Details

### File: `src/components/Dashboard/AddGuestModal.tsx`

**Change 1** (around line 741): Add handling for the duplicate name constraint:
```typescript
if (guestError.code === '23505' && guestError.message?.includes('uniq_guest_name_per_event')) {
  toast({
    title: "Duplicate Guest",
    description: `A guest named "${data.first_name} ${data.last_name}" already exists in this event.`,
    variant: "destructive",
  });
  setLoading(false);
  return;
}
```

**Change 2** (around line 1570-1606): Compute updated members array locally and pass it into `onSubmit` via a ref or parameter, so the relation data is available immediately without waiting for React state to update. The simplest approach: build the updated members array, set it in state, and use a `setTimeout(..., 0)` or store in a ref so `onSubmit` reads fresh data. Alternatively, attach the member relations to `pendingFormData` directly so they travel with the re-submission.

**Change 3** (around line 850-856): Add the same duplicate name error handling for party member inserts, so if a member name conflicts, the user sees a clear message identifying which member is duplicated.
