

## Add DELETE Confirmation to Bulk Delete Dialog

### What Changes

The bulk delete dialog (triggered via the purple selection bar at the bottom) currently allows immediate deletion without typing "DELETE". This update adds the same confirmation pattern used in the individual guest delete modal.

### Single File Change

**`src/components/Dashboard/GuestListTable.tsx`** (lines 2068-2084)

Replace the simple `AlertDialog` with a proper confirmation dialog that includes:

- Title: "You are deleting this guest" (1 guest) or "You are deleting X guests" (multiple) with a warning icon
- Description: Lists the count, states "Once it's gone you can't bring it back"
- "Type DELETE to confirm deletion" instruction with DELETE in red bold
- A confirmation text input (placeholder: "Type DELETE to confirm")
- Delete button only becomes clickable when user types "DELETE" in capitals
- Cancel and Delete buttons styled to match the existing individual delete modal (rounded-full, destructive variant)

### Technical Details

- Replace the `AlertDialog` component with a `Dialog` component (matching `GuestDeleteConfirmationModal` pattern)
- Add local state for the confirmation text input (e.g., `bulkDeleteConfirmText`)
- Reset the confirm text when the dialog opens/closes
- Disable the Delete button until `bulkDeleteConfirmText === 'DELETE'`
- Keep the existing `handleBulkDelete` function call on confirm
- Style to match the existing `GuestDeleteConfirmationModal`: purple title, red DELETE text, rounded-full buttons

