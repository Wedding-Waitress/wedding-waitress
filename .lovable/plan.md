
# Change Running Sheet Row Hover to Dark Purple

## What Changes

One CSS change in `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`, line 105.

Replace `hover:bg-purple-100` with `hover:bg-purple-200` -- this gives a noticeably darker purple hover that better matches the Wedding Waitress brand purple from the logo, while still keeping the row text readable.

If that's still too light, we can go darker to `hover:bg-purple-300` or even use a custom color like `hover:bg-[#7c3aed]/20` to match the exact logo purple.

## Technical Detail

- **File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`
- **Line 105:** Change `hover:bg-purple-100` to `hover:bg-purple-200`
- No other files changed
