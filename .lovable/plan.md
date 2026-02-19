
# Fix Group Header Hover and Darken Guest Row Hover

## Two Changes

### 1. Prevent color change on Family (blue) and Couple (orange) group headers
The `TableRow` base component applies `hover:bg-muted/50` to all rows, which washes out the blue/orange headers on hover. Fix by adding `hover:bg-blue-600` and `hover:bg-orange-500` to the group header rows so they stay their original color.

### 2. Make guest row hover purple shade darker
Currently `hover:bg-purple-50` -- change to `hover:bg-purple-100` for a noticeably darker but still subtle purple highlight.

## Technical Details

**File: `src/components/Dashboard/GuestListTable.tsx`**

- Line 1779: Change the group header TableRow from `bg-blue-600` / `bg-orange-500` to include matching hover classes:
  - Family: `"bg-blue-600 hover:bg-blue-600"`
  - Couple: `"bg-orange-500 hover:bg-orange-500"`

- Line 1802: Change guest row hover from `hover:bg-purple-50` to `hover:bg-purple-100` (and dark mode from `hover:bg-purple-950/20` to `hover:bg-purple-950/30`)
