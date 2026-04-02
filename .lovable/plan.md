

## Plan: Full Feature Parity for Running Sheet Shared Link

### Summary
Replace the simple HTML table in the public Running Sheet view with the same `RunningSheetSection` + `RunningSheetRow` components used on the dashboard, wired to new token-secured RPC functions for all write operations.

### Features to Add (items 1-12)
1. **Add Row** -- "Add Row" button at bottom
2. **Delete Row** -- via 3-dot menu per row
3. **Duplicate Row** -- via 3-dot menu per row
4. **Drag-and-drop reorder** -- full dnd-kit support
5. **Bold / Italic / Underline** -- formatting toggles per row
6. **Highlight Row** -- section header toggle (red text)
7. **Clear Text** -- per-row clear via 3-dot menu
8. **Undo** -- per-row undo stack
9. **Section label editing** -- click-to-edit section title
10. **Section notes** -- notes toggle + textarea
11. **Section-level bulk actions** -- Clear All / Reset to Default / Delete All
12. **Ceremony + Reception headers** -- event details banner matching dashboard

**Excluded**: Insert from DJ-MC Questionnaire (item 13)

### Database: 4 New RPC Functions

All follow the same pattern as the existing `update_running_sheet_item_by_token` -- validate token has `can_edit` permission, then perform the operation.

1. **`add_running_sheet_item_by_token(share_token, order_index)`** -- inserts a new blank row, returns the new row as JSON
2. **`delete_running_sheet_item_by_token(share_token, item_id)`** -- deletes a row belonging to the sheet
3. **`duplicate_running_sheet_item_by_token(share_token, item_id)`** -- copies a row, returns the new row as JSON
4. **`reorder_running_sheet_items_by_token(share_token, item_ids uuid[])`** -- sets order_index based on array position

The existing `update_running_sheet_item_by_token` already handles text fields. It needs two new optional parameters: `new_is_section_header`, `new_is_bold`, `new_is_italic`, `new_is_underline` for formatting toggles.

### Frontend Changes

**`src/pages/RunningSheetPublicView.tsx`** -- Major rewrite:
- Replace the HTML `<table>` with `RunningSheetSection` + `RunningSheetRow` (same components as dashboard)
- Wire all callbacks (add, delete, duplicate, reorder, update, undo, clear, reset, formatting) to the new token-based RPCs
- Pass `disabled={!canEdit}` to lock everything when View Only
- Keep: header, permission badge, Download PDF, footer, realtime subscriptions
- Keep: ceremony/reception event info banner (already partially present, will match dashboard format)
- Exclude: `onInsertFromDJMC` and `hasDJMCData` props (always false/undefined)

### Files to Change
- **New migration**: 4 new RPC functions + extend `update_running_sheet_item_by_token` with formatting params
- **`src/pages/RunningSheetPublicView.tsx`**: Rewrite to use dashboard components with token-based RPC wiring

### No Changes To (locked)
- `RunningSheetSection.tsx` -- already accepts `disabled` prop, reused as-is
- `RunningSheetRow.tsx` -- already accepts `disabled` prop, reused as-is
- `useRunningSheet.ts` -- dashboard hook, untouched
- `RunningSheetPage.tsx` -- dashboard page, untouched

