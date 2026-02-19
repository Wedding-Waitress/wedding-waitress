
# Enable Multi-line Entry (Enter Key) in All Three Running Sheet Columns

## What's Happening Now
- **EVENT** and **WHO** columns already use `<textarea>`, so Enter should already work there and auto-resize handles growing.
- **TIME** column uses a single-line `<input>`, which does not allow Enter/new lines.

## Changes

### File: `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

1. **Convert TIME from `<input>` to `<textarea>`** (lines 118-124) -- replace the `<input>` with a `<textarea>` matching the same styling, with `rows={1}` and auto-resize, so pressing Enter creates a new line within the same cell.

2. **Add a ref and auto-resize for TIME** -- add a `timeRef` (like `eventRef` and `whoRef`) and hook it into the existing `useAutoResize` helper so the TIME cell grows when the user adds lines.

3. **Update the TIME change handler** -- change `handleTimeChange` from `ChangeEvent<HTMLInputElement>` to `ChangeEvent<HTMLTextAreaElement>` to match the new element type.

No other files are changed. All three columns will support pressing Enter to add new lines within the same row.
