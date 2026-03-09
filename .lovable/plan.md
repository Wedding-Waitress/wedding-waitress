
I checked the current implementation and found the root cause: the frontend is calling `public_manage_guest_group`, but that RPC does not exist in your database right now. So “Family/Couple” grouping silently fails and the new guest remains a Single.

Plan to fix this properly:

1) Add missing DB RPC for public grouping
- Create a new migration that adds `public.public_manage_guest_group(...)` as `SECURITY DEFINER`.
- Function inputs: `_event_id`, `_new_guest_id`, `_referring_guest_id`, `_guest_type`.
- Validate both guests belong to the same live-view-enabled event.
- Implement rules exactly as requested:
  - `family`: assign new guest to referring guest’s existing `family_group`; inherit referrer table assignment; upsert `family_groups` + `family_group_members`.
  - `couple`: move referring guest out of old family into a new couple group with the new guest; keep/shared table assignment; update membership rows.
  - `individual`: ensure new guest is standalone (`family_group = null`) and no forced grouping.
- Keep operation idempotent (safe to re-run without duplicate member links).

2) Fix frontend error handling so failures are never hidden
- In `PublicAddGuestModal.tsx`, when calling `public_manage_guest_group`, stop swallowing errors.
- If grouping RPC fails, show destructive toast and do not show success message.
- Keep `onGuestAdded()` refresh behavior after successful grouping so dashboard/live view stays in sync.

3) Type safety update
- Regenerate/update `src/integrations/supabase/types.ts` to include `public_manage_guest_group` in `Database['public']['Functions']`.

4) Validate end-to-end behavior against your 3 rules
- Test from QR live view:
  - Milo + Family + Terry → Terry appears under El Alfi family (blue Family, not pink Single).
  - Milo + Couple + Terry → Milo moved out of family into couple with Terry (orange Couple).
  - Milo + Single + Terry → Milo stays in family, Terry is Single.
- Confirm dashboard Guest List classification reflects each case correctly.

5) Safety check for existing data
- Add a quick SQL verification query checklist (before/after) to confirm `family_group`, `table_id/table_no`, and `family_group_members` are correct for newly added guests.
