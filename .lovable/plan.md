

## Plan: Full Feature Parity for DJ-MC Questionnaire Shared Link

### Summary
Replace the simple `PublicSectionDisplay` component in `DJMCPublicView.tsx` with the full `DJMCQuestionnaireSection` + `DJMCSectionRow` components used on the dashboard, wired to new token-secured RPC functions. Identical approach to the Running Sheet parity work just completed.

### Current Gaps (Public View vs Dashboard)
The public view currently has only basic inline text editing for `value_text`, `music_url`, and `row_label`. Missing features:

1. **Add Row** -- per-section "Add Row" button
2. **Delete Row** -- per-row via actions
3. **Duplicate Row** -- per-row via actions
4. **Clear Row Text** -- per-row via actions
5. **Drag-and-drop reorder** -- dnd-kit support
6. **Section label editing** -- click-to-edit section title
7. **Section notes** -- notes toggle + textarea
8. **Section-level actions** -- Duplicate Section, Clear Section, Reset to Default, Delete Section
9. **Music URL field** -- rich component with metadata fetching (DJMCMusicUrlField)
10. **Pronunciation recorder** -- audio recording component (DJMCPronunciationRecorder)
11. **Song count / Speaker count badges** -- computed stats per section
12. **Column headers** -- section-type-specific column layouts
13. **Song Title & Artist field** -- editable field with proper column layout
14. **Duration field** -- for speeches section
15. **Ceremony + Reception headers** -- event details banner matching dashboard

### Database: New RPC Functions (Migration)

All follow the same pattern as the existing Running Sheet RPCs -- validate token has `can_edit` permission, then perform the operation.

1. **`add_dj_mc_item_by_token(share_token, section_id, row_label, at_order_index)`** -- inserts a new row, returns JSON
2. **`delete_dj_mc_item_by_token(share_token, item_id)`** -- deletes a row
3. **`duplicate_dj_mc_item_by_token(share_token, item_id)`** -- clones a row, returns JSON
4. **`reorder_dj_mc_items_by_token(share_token, section_id, item_ids uuid[])`** -- sets order_index by array position
5. **`update_dj_mc_section_by_token(share_token, section_id, ...)`** -- update section label, notes, is_collapsed
6. **Extend `update_dj_mc_item_by_token`** -- add `new_song_title_artist`, `new_duration`, `new_pronunciation_audio_url` parameters
7. **`clear_dj_mc_section_items_by_token(share_token, section_id)`** -- deletes all items in section (for Clear Section)
8. **`delete_dj_mc_section_by_token(share_token, section_id)`** -- deletes section and its items
9. **`duplicate_dj_mc_section_by_token(share_token, section_id)`** -- duplicates section with all items, returns JSON

### Frontend Changes

**`src/pages/DJMCPublicView.tsx`** -- Major rewrite:
- Remove the custom `PublicSectionDisplay` component entirely
- Import and use `DJMCQuestionnaireSection` + `DJMCSectionRow` (same components as dashboard)
- Wire all callbacks (add, delete, duplicate, reorder, update items, update sections, clear, reset, download section PDF) to the new token-based RPCs
- Pass `disabled={!canEdit}` to lock everything when View Only
- Keep: header, permission badge, Download PDF button, footer, realtime subscriptions
- Add: Ceremony + Reception event details banner matching the dashboard's `DJMCQuestionnairePage` format
- Exclude: nothing (full parity)

### Files to Change
- **New migration**: ~9 new/updated RPC functions
- **`src/pages/DJMCPublicView.tsx`**: Rewrite to use dashboard components with token-based RPC wiring

### No Changes To (locked/untouched)
- `DJMCQuestionnaireSection.tsx` -- already accepts `disabled` prop, reused as-is
- `DJMCSectionRow.tsx` -- already accepts `disabled` prop, reused as-is
- `DJMCMusicUrlField.tsx` -- reused as-is
- `DJMCPronunciationRecorder.tsx` -- reused as-is
- `useDJMCQuestionnaire.ts` -- dashboard hook, untouched
- `DJMCQuestionnairePage.tsx` -- dashboard page, untouched

