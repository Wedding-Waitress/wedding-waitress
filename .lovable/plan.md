

# Match Running Sheet Button Heights to Guest List Buttons

## What's changing

The "Sort By" and "Import/Export CSV" buttons on the Guest List page use the `size="xs"` variant, which translates to `h-7 px-2.5 text-xs` (28px height, smaller text and padding). The Running Sheet's "Share with..." and "Download entire running sheet PDF" buttons currently use `px-4 py-2 text-sm`, making them noticeably taller.

Both Running Sheet buttons will be updated to match the Guest List button dimensions exactly.

## Technical Details

**File:** `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx` (lines 175-189)

For both buttons, change the padding and text size classes:
- `px-4 py-2 text-sm` --> `h-7 px-2.5 text-xs`

This ensures a fixed height of 28px (`h-7`), compact horizontal padding, and smaller font size -- identical to the Guest List toolbar buttons.
