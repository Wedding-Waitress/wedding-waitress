

# Add Confirmation Warnings for Clear Text and Delete Row Actions

## What Changes

Two simple confirmation pop-up dialogs will be added to each Running Sheet row:

1. **Clear Text** -- When clicked, a warning pop-up appears saying: *"This will clear all text on this row. Once cleared, it cannot be retrieved."* with **Cancel** and **Clear Text** buttons.

2. **Delete** -- When clicked, a warning pop-up appears saying: *"This will delete this row. Once deleted, it cannot be retrieved."* with **Cancel** and **Delete** buttons.

No typing "DELETE" required -- just simple Cancel / action buttons.

Duplicate stays as-is (no warning needed since it's non-destructive).

## Technical Details

### File: `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

- Import `AlertDialog` components from `@/components/ui/alert-dialog`.
- Add two pieces of state: `showClearDialog` and `showDeleteDialog` (both `boolean`, default `false`).
- Change the Clear Text button's `onClick` to `setShowClearDialog(true)` instead of calling `onClearText` directly.
- Change the Delete button's `onClick` to `setShowDeleteDialog(true)` instead of calling `onDelete` directly.
- Add two `AlertDialog` components at the bottom of the row JSX:
  - **Clear Text dialog**: Title "Clear Text?", description "This will clear all text on this row. Once cleared, it cannot be retrieved.", Cancel button, and "Clear Text" action button.
  - **Delete dialog**: Title "Delete Row?", description "This will delete this row. Once deleted, it cannot be retrieved.", Cancel button, and "Delete" action button (styled destructive).

