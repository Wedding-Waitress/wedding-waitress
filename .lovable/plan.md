

# Add "Clear All Fields" and Per-Row "Clear Text" to Running Sheet

## Changes

### 1. "Clear All Fields" in the dropdown menu (three dots)

Add a new menu item **above** "Reset to Default" in the three-dot dropdown. It will have a small eraser/X icon and the label "Clear All Fields". When clicked, it will clear the `time_text`, `description_rich`, and `responsible` fields on every row -- but keep the rows themselves intact (unlike "Reset to Default" which replaces rows with the template).

A confirmation dialog will appear: "Clear All Fields? This will erase the text in every row but keep the rows. This cannot be undone."

### 2. Per-row "Clear Text" icon button

Between the Duplicate and Delete icons on each row, add a new icon button (using the `Eraser` icon from lucide-react). On hover it shows the tooltip "Clear Text". Clicking it clears that single row's `time_text` to `""`, `description_rich` to `{ text: "" }`, and `responsible` to `""`.

## Technical Details

### File: `src/components/Dashboard/RunningSheet/RunningSheetSection.tsx`

- Import `Eraser` from lucide-react.
- Add a `clearAllFields` callback that calls `onUpdateItem` for every item, setting `time_text: ""`, `description_rich: { text: "" }`, `responsible: ""`.
- Add a new `DropdownMenuItem` with the Eraser icon and "Clear All Fields" label above the existing "Reset to Default" item (line 163).
- Add a confirmation `AlertDialog` for "Clear All Fields" (similar to the existing Reset to Default dialog).
- Pass a new `onClearText` prop down to `RunningSheetRow`.

### File: `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

- Import `Eraser` from lucide-react.
- Accept a new `onClearText` prop (`(itemId: string) => void`).
- Add a new `Button` between Duplicate and Delete (line 155-156) with the Eraser icon, `title="Clear Text"`, that calls `onClearText(item.id)`.

