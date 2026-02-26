

# Add "Add Guest" Button to Live View with Public Guest Form

## Overview
Add a third "Add Guest" button next to Accept/Decline on the guest card in the QR code live view. When clicked, it opens a simplified guest form that allows guests to add extra people (partner, friend, family member). The new guest is inserted via a secure RPC function and syncs in real time.

## Changes

### 1. New Supabase RPC Function (Migration)
Create a `add_guest_public` SECURITY DEFINER function that:
- Accepts `event_id`, `first_name`, `last_name`, `rsvp`, `dietary`, `mobile`, `email`, and `guest_type` (individual/couple/family)
- Validates the event exists and has `qr_apply_to_live_view = true`
- Looks up the event's `user_id` (required for the `guests` table)
- Inserts the new guest with `rsvp = 'Attending'` by default, no table/seat assignment
- Logs the addition to `guest_update_logs`
- Returns the new guest's ID on success

### 2. New Component: `PublicAddGuestModal`
**File:** `src/components/GuestLookup/PublicAddGuestModal.tsx`

A simplified, guest-friendly modal with:
- Title: "Add New Guest"
- Subtitle text: "Add an extra individual, your partner (couple), or a family member"
- Three toggle options: Individual / Couple / Family (styled like the existing Add Guest modal tabs)
- For "Individual": First Name, Last Name, Dietary, Mobile (optional)
- For "Couple": Two sets of name fields
- For "Family": Primary name fields + ability to add family members with a "+" button
- RSVP defaults to "Attending"
- Save button (green, matching app conventions) and Cancel button (red)
- On submit: calls the `add_guest_public` RPC for each person
- Shows success toast and triggers `onUpdate` to refresh data
- Real-time sync is already handled by the existing Supabase realtime subscription in `GuestLookup.tsx` (INSERT events on line 399)

### 3. Update `EnhancedGuestCard.tsx`
- Import `Plus` from lucide-react
- Add a new `onAddGuest` callback prop (optional)
- Add a third button next to Accept/Decline: dark purple background (`bg-primary`), white text, with a `+` icon followed by "Add Guest"
- Same size as Accept/Decline buttons
- Only shown when `isEditable` is true

### 4. Update `GuestLookup.tsx`
- Import `PublicAddGuestModal`
- Add state for `showAddGuestModal` and pass the event_id to the modal
- Pass `onAddGuest` handler to `EnhancedGuestCard` that opens the modal
- On guest added, call `refreshGuestData()` (the realtime subscription will also pick it up)

## Technical Details

### RPC Function SQL
```sql
CREATE OR REPLACE FUNCTION public.add_guest_public(
  _event_id UUID,
  _first_name TEXT,
  _last_name TEXT,
  _rsvp TEXT DEFAULT 'Attending',
  _dietary TEXT DEFAULT 'NA',
  _mobile TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
  _new_guest_id UUID;
BEGIN
  -- Validate event exists and has live view enabled
  SELECT user_id INTO _owner_id
  FROM events
  WHERE id = _event_id AND qr_apply_to_live_view = true;

  IF _owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert new guest
  INSERT INTO guests (event_id, user_id, first_name, last_name, rsvp, dietary, mobile, email)
  VALUES (_event_id, _owner_id, _first_name, _last_name, _rsvp, COALESCE(_dietary, 'NA'), _mobile, _email)
  RETURNING id INTO _new_guest_id;

  -- Log the addition
  INSERT INTO guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _new_guest_id, jsonb_build_object(
    'action', 'add_guest',
    'first_name', _first_name,
    'last_name', _last_name
  ), 'public_live_view');

  RETURN _new_guest_id;
END;
$$;
```

### Button Layout in EnhancedGuestCard
The three buttons will be in a row using `flex gap-2`:
- Accept (green, flex-1)
- Decline (red, flex-1)
- Add Guest (purple/primary, flex-1) with Plus icon

### Real-Time Sync
Already working -- the `GuestLookup.tsx` realtime subscription (line 399) handles `INSERT` events on the `guests` table, so newly added guests will appear instantly across all connected views (dashboard, kiosk, other live view sessions).

### Files Changed
1. **New migration SQL** -- `add_guest_public` RPC function
2. **New file:** `src/components/GuestLookup/PublicAddGuestModal.tsx`
3. **Modified:** `src/components/GuestLookup/EnhancedGuestCard.tsx` -- add "Add Guest" button + `onAddGuest` prop
4. **Modified:** `src/pages/GuestLookup.tsx` -- wire up modal state and pass handler to EnhancedGuestCard

