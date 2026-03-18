
Plan

1. Rename the label
- In `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`, change the Text Position section label from `Edit Mode` to `Text Edit Mode`.
- Keep the same switch, icon, styling, placement, and behavior.

2. Fix the save failure at the source
- In `src/hooks/usePlaceCardSettings.ts`, harden the first-save flow for place card settings.
- I checked the database logs, and the current failure is coming from fresh inserts still hitting NOT NULL errors on required offset fields such as:
  - `guest_name_offset_x`
  - `table_offset_x`
- That means drag actions are still reaching the “no settings row yet” insert path, and the initial record creation is not being made robust enough before the move is saved.

3. Make initial record creation explicit and reliable
- Refactor the hook so it uses one shared “full default settings” builder for new records.
- On the first change, if no `settings.id` exists:
  - create the base `place_card_settings` row with a complete payload for all required fields
  - then apply the user’s requested change against that saved row
- This avoids partial drag/style updates trying to create a row on the fly with missing required columns.

4. Keep the preview in sync so moved text stays where dropped
- Update the hook to immediately merge the saved/created values back into local state from one normalized source.
- This ensures Guest Name and Table/Seat drag changes persist visually after release and remain synced with the Text Position controls.
- No other visual editor behavior changes: same selection, same handles, same toolbar, same global-sync editing.

Files to update
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`
  - Rename `Edit Mode` → `Text Edit Mode`
- `src/hooks/usePlaceCardSettings.ts`
  - Extract shared default payload / normalization helper
  - Create missing settings record first with full defaults
  - Then apply partial updates safely
  - Sync the returned data back into local state

Technical note
- This is the safest fix because the current error is not just a label issue; it is a persistence bug on first-time settings creation.
- I will preserve all current functionality and only fix:
  1. the wording change
  2. the failed-save / drag-not-sticking behavior
