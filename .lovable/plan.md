

## Center and Expand the Three Onboarding Boxes

### What Changes

The three boxes (Choose Event, Type of Event, Guest Relations) will stretch to fill the full width of the Guest List container, with equal gaps on both the left and right edges, and equal box widths.

### Technical Details

**File**: `src/components/Dashboard/GuestListTable.tsx`

**Root cause**: The three boxes sit inside a `flex-shrink-0` wrapper (line 1366) which prevents them from expanding to the full container width. The boxes only take up their natural content width, leaving extra space on the right.

**Two changes needed:**

1. **Line 1366** -- Change `flex-shrink-0` to `w-full` on the wrapper div so it spans the full width of the parent container:
   - Current: `<div className="flex-shrink-0">`
   - New: `<div className="w-full">`

2. **Line 1377** -- Switch the three-box container from flexbox to CSS grid and remove the asymmetric `pr-1`:
   - Current: `<div className="flex flex-col md:flex-row gap-4 pr-1">`
   - New: `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">`

This makes the wrapper span the full container width, and the CSS grid ensures all three boxes are exactly equal width (`1fr` each). The parent container's existing `px-3 sm:px-6` padding creates consistent gaps on both sides. No other elements, styles, or functionality are changed.

