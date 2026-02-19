

# Add "Delete All Rows" to Running Sheet Dropdown

## What Changes

In the three-dot dropdown menu on the Running Sheet section header, a third option will be added:

1. **Clear All Fields** -- stays as-is
2. **Reset to Default** -- stays as-is
3. **Delete All Rows** (NEW) -- red trash icon and red text. Deletes every row in the section, leaving it empty so you can start fresh and manually add rows.

Clicking "Delete All Rows" shows a confirmation pop-up before taking action.

## Technical Details

### File: `src/components/Dashboard/RunningSheet/RunningSheetSection.tsx`

**State:**
- Add `showDeleteAllDialog` boolean state (default `false`).

**Dropdown menu (after "Reset to Default", around line 171):**
- Add a new `DropdownMenuItem` for "Delete All Rows" with a `Trash` icon (already imported), styled in red using `className="text-destructive"`.

**Delete All Rows logic:**
- On confirm, iterate through all `items` and call `onDeleteItem(item.id)` for each.

**New AlertDialog (after existing dialogs):**
- Title: "Delete All Rows?"
- Description: "This will delete all the rows. Start fresh and manually add rows as you desire. Once deleted, they cannot be retrieved."
- Buttons: Cancel and "Delete" (destructive styled)
