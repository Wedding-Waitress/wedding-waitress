## Restore Relationship (Partner + Role) in Add & Edit Guest

### What's actually in the codebase right now

The Partner+Role Relationship system is **NOT deleted** — the data, helpers, and dialog all still exist:

- DB columns on `guests`: `relation_partner`, `relation_role`, `relation_display` — present and populated.
- Helper: `src/lib/relationUtils.ts` — `computeRelationDisplay()` produces "Mahmoud — Guest".
- Picker dialog: `src/components/Dashboard/RelationAssignmentDialog.tsx` — fully functional Partner + Role step-by-step flow.
- Display: `RelationBadge.tsx` and the Guest List table/cards already render `relation_display`.
- Add flow (`AddGuestModal.tsx` line 521): when relations are enabled, submitting opens `RelationAssignmentDialog` before saving — so Add mode DOES capture Partner+Role, but there is no visible field/preview row in the form itself before submit.
- Edit flow (`AddGuestModal.tsx` lines 1342–1378): renders an inline Relation row with a "Change" button — but it is gated behind `isEdit && relation_mode !== 'off'`. In your Edit screenshot it is missing, which means either the row was wrapped/hidden by a recent change, or the event's `relation_mode` is being treated as `off`.

So the fix is **not a rebuild** — it is restoring a single visible "Relation" row inside both modals (placed below Seat Number, above RSVP/Dietary), wired to the existing data and existing `RelationAssignmentDialog`.

### Changes (only `AddGuestModal.tsx`)

1. **Add a visible "Relation" row in BOTH Add and Edit modes**, placed directly **below the Table/Seat row (line ~1127) and above the RSVP Invite Status / RSVP / Dietary block (line ~1130)**. This matches the requested placement.

2. The row contains:
   - Label: `Relation` (with red `*` if `relation_settings.relation_required`).
   - A read-only pill showing the current value:
     - If `relation_partner` + `relation_role` are set → render `computeRelationDisplay(...)` → e.g. "Mahmoud — Guest".
     - Otherwise → muted text "No relation set".
   - A `Set` / `Change` button (rounded, outline, brown — same style as the existing Edit-mode row at lines 1349–1375) that opens the existing `RelationAssignmentDialog` for the main guest only (`peopleToAssign = [{ name, index: -1 }]`).

3. **Remove the `&& isEdit` gate** on the existing Relation block (line 1343) so it renders in Add mode too. Keep the `relations_hidden` / `relation_mode === 'off'` gate so users who have intentionally turned Relationships OFF still see nothing.

4. In Add mode, when the user clicks "Set", reuse the existing dialog wiring (lines 1486–1565). On `onComplete`, write `relation_partner` + `relation_role` into the form via `form.setValue(...)` (already happens at lines 1497–1498) and close the dialog WITHOUT auto-submitting — the user keeps editing the form and submits manually with the green button.

5. **Submit behaviour stays untouched**:
   - Add: existing flow at line 521 still triggers `RelationAssignmentDialog` if relation is required and missing — unchanged safety net.
   - Edit: existing update at line 600 already writes `relation_partner`, `relation_role`, `relation_display` — unchanged.

6. **Sync**: no work needed. Guest cards (`GuestMobileCard.tsx`), the desktop table (`GuestListTable.tsx` via `RelationBadge.tsx`), and all chart exports already read `relation_display` and update via the existing realtime channel `kiosk-guests:event:${eventId}`.

### Styling (no changes elsewhere)

Reuse the exact classes from the existing inline Edit row so it matches RSVP/Dietary dropdowns:

- Pill: `rounded-full border-2 border-primary/30 bg-muted/30 px-3 py-2 text-sm`
- Button: `rounded-full border-primary text-primary hover:bg-primary/10`
- Mobile: `max-lg:flex-col max-lg:items-stretch max-lg:w-full max-lg:h-11`

No changes to RSVP logic, guest categories, dietary list, validation schema, or any other component.

### What does NOT change

- No new DB columns. No migration. The new "Relationship" 7-option dropdown from your earlier prompt is **not** added — per your answer we keep the existing Partner+Role system.
- No styling/layout changes outside the new row.
- No changes to `GuestListTable.tsx`, `GuestMobileCard.tsx`, `RelationBadge.tsx`, `RelationAssignmentDialog.tsx`, `relationUtils.ts`.
- Locked `MOBILE MODAL SYSTEM` and dashboard utilities are respected.

### Global Protection Rule (memory)

Add a new Core memory line so this never happens again:

> NEVER remove, replace, or alter a previously implemented feature (UI, field, logic, structure) unless the user explicitly requests it. If a request would do so, FIRST reply: "This change will modify or remove an existing implemented feature: [name]. Do you want to proceed?" and WAIT for confirmation.

This will be appended to `mem://index.md` Core section and a dedicated `mem://standards/no-silent-feature-removal` file.

### Files touched

- `src/components/Dashboard/AddGuestModal.tsx` — add the Relation row (Add+Edit), remove the `isEdit` gate on the existing block.
- `mem://index.md` + `mem://standards/no-silent-feature-removal` — protection rule.

### Verification after build

- Add Guest → Relation row visible below Seat Number, "Set" button opens picker, value persists in form, saves to DB on submit, shows on card/table immediately.
- Edit Guest → Relation row visible with current value, "Change" works, saves on Update.
- Mobile, tablet, desktop all render correctly (full-width on `max-lg`).
- Toggle "Enable Relationships OFF" → row hidden everywhere (existing gate preserved).
