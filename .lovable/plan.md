

## Plan: Fix "+ Guest" Live View sync and rename button

### Problem
The RPC function `get_public_event_with_data_secure` does not return the `allow_plus_one` column from the `guests` table. The Live View never receives this value, so `allow_plus_one` is always `undefined`, and the condition `!== false` always passes — showing the button regardless of the setting.

### Changes

**1. Update RPC function `get_public_event_with_data_secure`** (SQL migration)
- Add `g.allow_plus_one` to the SELECT list and RETURNS TABLE definition
- This ensures the Live View receives the actual database value

**2. Rename button text in `EnhancedGuestCard.tsx`**
- Change "Add Guest" → "Plus Guest" on the button label

**3. Update `GuestLookup.tsx`** 
- Remove the `(guest as any)` cast — the field will now be part of the returned data, accessed as `guest.allow_plus_one`

### Files
- New migration SQL (alter RPC function to include `allow_plus_one`)
- `src/components/GuestLookup/EnhancedGuestCard.tsx` — rename button
- `src/pages/GuestLookup.tsx` — clean up type cast

