

## Convert Bulk Action Bar to Modal

**What**: Replace the fixed purple horizontal bulk actions bar at the bottom of the screen with a centered modal popup that matches the "Edit Guest" modal styling.

### File: `src/components/Dashboard/GuestBulkActionsBar.tsx`

**Complete rewrite** of this component:

- Remove the fixed bottom bar layout entirely
- Replace with a Dialog/modal using the existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` components from `@/components/ui/dialog`
- Accept a new `isOpen` prop (triggered when `selectedGuestIds.size > 0`)

**Modal structure:**
1. **Header**: Title "Manage Selected Guests", subtext "Apply actions to your selected guests", dynamic "{X} guests selected" badge
2. **Body**: Vertical stack of action buttons, each styled as a bordered row with icon + label:
   - Select All / Deselect All (toggle)
   - Update RSVP (with CheckCircle2 icon)
   - Send Email (with Mail icon, conditionally shown)
   - Send SMS (with Phone icon, conditionally shown)
   - Delete Guests (danger/red styled, with Trash2 icon)
3. **Footer**: Two buttons matching Edit Guest modal style:
   - Left: "Cancel" (red/destructive outline)
   - Right: "Apply" is not needed since each action triggers immediately — keep individual action buttons that fire their callbacks and close the modal

**Design details:**
- White background, rounded-xl corners, dark overlay (all from existing Dialog component)
- Each action row: `p-3 rounded-lg border hover:bg-muted/50 cursor-pointer flex items-center gap-3` with icon and label
- Delete row: `border-red-200 text-red-600 hover:bg-red-50`
- Close via X button (top right), Cancel button, or after action click
- Same font sizes and spacing as Edit Guest modal

### File: `src/components/Dashboard/GuestListTable.tsx`

**Lines ~2154-2182**: Update the rendering to pass `isOpen` and `onClose` props instead of conditionally rendering based on selection count. The modal will show when guests are selected and close on cancel/action.

- Change: `<GuestBulkActionsBar ... />` usage to include `isOpen={selectedGuestIds.size > 0}` and `onClose={handleDeselectAll}`
- All existing callback props remain the same

