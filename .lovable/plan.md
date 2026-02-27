

# Fix Event Edit Not Syncing Changes Across All Fields

## Problem
When editing an event via the Edit button in My Events, changes to the ceremony name (e.g., fixing a typo from "Weddng" to "Wedding") do not propagate to:
1. The **reception name** (stays as old value)
2. The **countdown event name** (uses `event.name` which maps from the top-level field)
3. The **My Events header** and **event table row** (both use `event.name`)

**Root cause:** The Edit Modal (`EventEditModal.tsx`) lacks the auto-sync logic that the Create Modal has. In the Create Modal, changing the ceremony name auto-updates the reception name and top-level event name. The Edit Modal does NOT have this -- each field is independent.

Additionally, `event_display_name` is never saved during edits, even though it's loaded into the form.

## Solution

### 1. Add auto-sync to EventEditModal (matching EventCreateModal pattern)

Add the same `useEffect` sync logic from the Create Modal into the Edit Modal:
- When ceremony name changes, auto-update `event_name` (top-level) and reception `name` -- unless the user has manually overridden them
- When ceremony date, venue, address, phone, contact, guest limit, or RSVP deadline change, sync to corresponding reception fields -- unless overridden
- Track which reception fields the user has manually edited using a `receptionOverrides` ref (same pattern as Create Modal)
- Exclude start_time and finish_time from sync (per existing requirement)

### 2. Save event_display_name on edit

Add `event_display_name: formData.event_name` to the save payload in `handleSave`, alongside the existing `name: formData.event_name` line.

### Files Modified
1. **`src/components/Dashboard/EventEditModal.tsx`**
   - Add `receptionOverrides` ref to track manual field edits
   - Add `markReceptionOverride` helper function
   - Add `useEffect` for ceremony-to-reception auto-sync (same logic as Create Modal)
   - Update reception field `onChange` handlers to call `markReceptionOverride` before setting values
   - Add `event_display_name: formData.event_name` to the save payload

### Technical Detail
The sync map mirrors the Create Modal exactly:
- `ceremony_name` syncs to `name` (reception name) and `event_name` (top-level)
- `ceremony_date` syncs to `date`
- `ceremony_venue` syncs to `venue`
- `ceremony_venue_address` syncs to `venue_address`
- `ceremony_venue_phone` syncs to `venue_phone`
- `ceremony_venue_contact` syncs to `venue_contact`
- `ceremony_guest_limit` syncs to `guest_limit`
- `ceremony_rsvp_deadline` syncs to `rsvp_deadline`

This ensures that when a user fixes a typo in the ceremony name and saves, ALL display areas update consistently.
