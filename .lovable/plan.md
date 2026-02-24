
# Fix Place Cards Header Layout

## Changes

### 1. Move Table dropdown next to Choose Event (same row)
Currently the Table dropdown sits below Choose Event due to `flex-wrap`. Change the dropdowns wrapper to `flex-nowrap` so both dropdowns appear side by side on the same line.

### 2. Move Export Controls to its own row below, right-aligned
Separate the Export Controls from the dropdowns row. Add an empty line gap, then render the Export Controls on its own row, right-aligned. Make the Export Controls box wider so all text and button labels display on single lines without wrapping.

## Technical Details

### File: `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` (lines 314-406)

1. **Line 315**: Break the single outer `flex` container into two separate rows
2. **Line 317**: Change dropdowns wrapper from `flex-wrap` to `flex-nowrap` so Choose Event and Table sit side by side
3. **Lines 379-406**: Move the Export Controls block outside the dropdowns row into its own container below, with:
   - A spacer/gap above it (empty line effect via `mt-4`)
   - `flex justify-end` to push it right
   - `whitespace-nowrap` on button text and description to prevent wrapping
   - Remove width constraints so the box can expand to fit content on one line
