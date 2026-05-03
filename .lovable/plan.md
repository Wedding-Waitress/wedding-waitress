## Fix: Relation Row Placement in Add New Guest Modal

### Findings

The Relation (Partner + Role) row IS already rendered in `src/components/Dashboard/AddGuestModal.tsx` (line 1342) and is NOT gated by `isEdit` — it shows in both Add and Edit modes whenever relations are not turned off.

The real problem is **placement**. Current order in the modal is:

1. First Name / Last Name
2. Mobile / Email
3. Table / **Seat Number**
4. **RSVP Status / Dietary Requirements** (combined row)
5. Party Members (Couple/Family only)
6. **Relation** ← currently here
7. Notes

The spec requires Relation to sit **directly below Seat Number and directly above Dietary Requirements** — matching the Edit modal layout the user expects.

There is also a secondary risk: `relations_hidden` (page-level toggle) or event `relation_mode === 'off'` will still hide the row. That behaviour is intentional and stays — but we'll add a note to ensure it isn't accidentally hiding it for the user's current event.

### Changes (single file: `src/components/Dashboard/AddGuestModal.tsx`)

1. **Move the existing Relation block** (lines ~1342–1387) to sit immediately after the Table / Seat Number row (~line 1146) and **before** the RSVP + Dietary grid (~line 1148).
   - The combined RSVP + Dietary grid stays as a single row, so "above Dietary" is achieved by placing Relation above that grid.
2. Keep the existing `relationsHidden` / `relation_mode === 'off'` guard exactly as-is (do not show when explicitly disabled).
3. Keep the existing logic that:
   - Shows "Set" when no relation is assigned, "Change" when one exists.
   - Opens `RelationAssignmentDialog` with the typed name (or "New guest" fallback) for new guests.
   - Does NOT set `pendingFormData` in Add mode, so the dialog won't auto-submit.
4. No styling, spacing, colour, or other field changes.
5. Verify in preview that for an event with `relation_mode` of `two` or `single`, the Relation row appears in the Add modal between Seat Number and the RSVP/Dietary row.

### Out of Scope (will NOT change)

- RSVP logic, guest categories, party member flow, validation, save logic.
- Edit modal structure (already correct — we're just matching it).
- Any other component, page, or styling.
- The `relations_hidden` toggle behaviour.

### Verification Checklist

- Open Add New Guest → Relation row visible directly below Seat Number, directly above Dietary.
- Open Edit Guest → same placement, same component, same data binding.
- Click "Set" in Add mode → Relation Assignment dialog opens, selecting Partner + Role updates the pill, no auto-submit.
- Save new guest → `relation_partner`, `relation_role`, `relation_display` persist and show on guest cards / table view.
- If event has `relation_mode = 'off'` or page toggle hides relations → row remains hidden (unchanged behaviour).
