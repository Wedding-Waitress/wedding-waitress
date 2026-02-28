

# Place Cards Position Tab Cleanup and Slider Fix

## 2 Changes

### 1. Remove "Seat Number Position" section and rename "Table Number Position"
- Delete the entire "Seat Number Position" block (lines 636-665) since table and seat are on the same line
- Rename "Table Number Position" label to "Table & Seat Number Position"
- Remove `seat_offset_x` and `seat_offset_y` from the "Reset to Default" button handler (keep them zeroed but don't show controls)

### 2. Fix slider lag -- use local state with deferred save
The sliders currently call `onSettingsChange` (which writes to Supabase) on every single drag tick, causing heavy lag. The fix:

- Add local state variables for the 4 remaining offset values (guest name X/Y, table X/Y)
- Sync local state from settings when settings change externally
- Use `onValueChange` to update **local state only** (instant, no lag)
- Use `onValueCommit` (fired when user releases the slider) to save to Supabase
- Add `cursor-grab` / `cursor-grabbing` styles to the slider thumb for better UX feedback

**Files modified:**
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx` -- remove seat section, rename table label, add local state for sliders, use onValueCommit
- `src/components/ui/slider.tsx` -- add grab cursor styles to thumb
