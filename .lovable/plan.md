# Guest Relationship Override — Phase 1

## File note
Spec names `EditGuestModal.tsx`, but in this codebase Edit Guest is rendered by `src/components/Dashboard/AddGuestModal.tsx` (`isEdit` mode). All edits land in that single file. No other file is touched.

## Where it goes in the UI
Insert a new section in the form, between:
- the **Seat Number** field block (ends ~line 1126), and
- the **RSVP Invite Status** block (starts ~line 1129).

Only render when `isEdit && editGuest` (override is meaningless in Add mode — Add already lets users pick relation/family).

Style/spacing matches surrounding fields: same `<FormItem>` / `<Label>` / `<Select>` patterns, rounded-full bordered inputs, mobile-friendly. No drawer width change, no redesign.

## Grouping detection (read current state)
Mirror the logic already used in `GuestListTable.tsx`:
- `family_group` empty/null → **Individual**
- `family_group` name contains ` & ` OR ends with ` Couple` → **Couple**
- Otherwise → **Family**

This becomes the initial value of the new `Guest Group Type` select.

## New UI block

```text
Guest Group Type      [ Individual | Couple | Family ▼ ]

— if Couple selected —
Partner Guest         [ search/select existing guest in this event ▼ ]

— if Family selected —
Family Group Name     [ text input — placeholder: e.g. King Family ]
                      (defaults to current family_group when guest already in a family)
```

Local state only (no new hooks/files):
- `groupTypeOverride: 'individual' | 'couple' | 'family' | null`
- `partnerGuestId: string | null`
- `familyGroupNameOverride: string`

`Partner Guest` dropdown source = existing guests for `eventId` (already available via the table_id selector data path), excluding the current guest. Reuse current Select styling.

## Save behavior (only fires if user actually changed group type or its sub-field)

Runs as a **separate, additive step inside the existing edit `onSubmit`**, AFTER the current guest update succeeds. Wrapped in its own try/catch so a failure here cannot corrupt the rest of the save; on failure shows a toast and leaves seating/RSVP/etc untouched.

Touches ONLY `guests.family_group`. Never writes to: `table_id`, `table_no`, `seat_no`, `rsvp`, `dietary`, `notes`, `relation_partner`, `relation_role`, invite/SMS/email tables, plus-one fields, or any seating/chart table.

### → Individual
1. Capture `oldGroup = editGuest.family_group`.
2. Update current guest: `family_group = null`.
3. Run **single-member cleanup** on `oldGroup` (see below).

### → Couple
1. Require `partnerGuestId`. If missing, inline form error, abort this sub-step only.
2. Build couple group name: `"<currentFirstName> & <partnerFirstName> Couple"` (matches existing couple-name convention `' & '` / `' Couple'`).
3. Capture `oldGroupCurrent` and `oldGroupPartner`.
4. Update both guests' `family_group` to the new couple name (two `update` calls by id).
5. Run single-member cleanup on `oldGroupCurrent` and `oldGroupPartner` if they differ from the new name.

### → Family
1. Require trimmed `familyGroupNameOverride`. If empty, inline form error, abort sub-step.
2. Capture `oldGroup`.
3. Update current guest: `family_group = <trimmed name>`.
4. Run single-member cleanup on `oldGroup` if it differs from the new name.

## Single-member family auto-cleanup (helper inside the modal)

After any of the above, for each `oldGroup` that is non-null and changed:
1. Query `guests` where `event_id = eventId` AND `family_group = oldGroup`.
2. If exactly **1** remaining member → update that member's `family_group = null` (becomes Individual).
3. If 0 remaining → nothing to do (the group header simply disappears in the list, which already keys off `family_group`).

This is the entire fix for the “Family • 1 member” / Susan / Sallisonton case and runs automatically on every override save.

## Realtime / list refresh
No extra wiring required. `GuestListTable` and `useRealtimeGuests` already react to `guests` row updates and recompute group headers + counts from `family_group`. The existing post-save `onGuestSaved` / refetch path in this modal already triggers UI refresh.

## Explicit non-goals (will NOT be implemented in this phase)
- No merge/split families, no drag-drop regrouping, no AI suggestions, no bulk editor.
- No warning modals, no relationship history log.
- No automatic seat/table movement.
- No changes to RSVP, dietary, invitations, SMS/email history, notes, plus-ones, seating charts.
- No DB migrations, no new tables, no edge functions.

## Verification checklist
1. Susan in `Family • 1 member` → switch to Individual → save:
   - Susan no longer under family header, family header gone, table/seat/RSVP unchanged.
2. Pick guest → switch to Couple → choose partner → save:
   - Both guests appear under one couple group, seating untouched for both.
3. Switch guest to Family with name `King Family` → save:
   - Guest joins King Family, member count increments, header refreshes, no seating change.
4. Sanity: edit a guest WITHOUT touching the new section → save behaves exactly as today (no DB writes to `family_group`).
