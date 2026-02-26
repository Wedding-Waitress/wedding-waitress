

# Add "Additional Guests" Row to Guest Card

## Overview
Add a new stat row between "Dietary Requirements" and "RSVP Status" on the guest card showing how many additional guests this person has added via the public Add Guest feature. This requires tracking which guest triggered each addition.

## Changes

### 1. Database Migration -- Add `added_by_guest_id` Column
Add a nullable `added_by_guest_id` UUID column to the `guests` table. This links newly added guests back to the original guest who added them.

```sql
ALTER TABLE public.guests ADD COLUMN added_by_guest_id UUID REFERENCES public.guests(id);
```

Also update the `add_guest_public` RPC to accept `_added_by_guest_id` and store it:

```sql
CREATE OR REPLACE FUNCTION public.add_guest_public(
  _event_id UUID, _first_name TEXT, _last_name TEXT,
  _rsvp TEXT DEFAULT 'Attending', _dietary TEXT DEFAULT 'NA',
  _mobile TEXT DEFAULT NULL, _email TEXT DEFAULT NULL,
  _added_by_guest_id UUID DEFAULT NULL   -- NEW
) ...
INSERT INTO guests (..., added_by_guest_id)
VALUES (..., _added_by_guest_id);
```

### 2. Update `PublicAddGuestModal` -- Pass the Adding Guest's ID
- Add a new prop `addedByGuestId: string` to the modal interface.
- Pass `_added_by_guest_id: addedByGuestId` in the RPC call.

### 3. Update `GuestLookup.tsx` -- Track Selected Guest and Compute Counts
- Add state `addGuestForId` to remember which guest clicked "Add Guest".
- Pass that ID to `PublicAddGuestModal` as `addedByGuestId`.
- Compute a `additionalGuestCounts` map from the full guest list: count guests where `added_by_guest_id === guest.id`.
- Pass the count to each `EnhancedGuestCard`.

### 4. Update `EnhancedGuestCard.tsx` -- Display the Row
- Add `additionalGuestCount?: number` prop.
- Import `UserPlus` icon from lucide-react.
- Insert a new row between Dietary and RSVP with the same styling as existing rows:

```tsx
{(additionalGuestCount ?? 0) > 0 && (
  <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
    <UserPlus className="w-5 h-5 text-primary mt-0.5" />
    <div className="flex-1">
      <div className="font-semibold text-foreground">Additional Guests</div>
      <div className="text-sm text-muted-foreground">
        {additionalGuestCount} added
      </div>
    </div>
  </div>
)}
```

### 5. Update Supabase Types
Add `added_by_guest_id` to the TypeScript types for the `guests` table.

### Files Changed
1. New migration SQL -- add column + update RPC
2. `src/integrations/supabase/types.ts` -- add `added_by_guest_id`
3. `src/components/GuestLookup/PublicAddGuestModal.tsx` -- accept and pass `addedByGuestId`
4. `src/components/GuestLookup/EnhancedGuestCard.tsx` -- new row with `UserPlus` icon
5. `src/pages/GuestLookup.tsx` -- track which guest is adding, compute counts, pass to card

