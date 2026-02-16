

## Make Guest List Rows More Compact

Reduce the vertical height of each guest row in the Guest List table so more guests are visible on screen at once. No content or styling will be distorted -- only the vertical spacing (padding) inside each cell is reduced.

### What Changes

**File: `src/components/Dashboard/GuestListTable.tsx`**

Add `py-1` (4px vertical padding instead of 16px) to every `TableCell` in the guest data rows (lines 1767-1880). This cuts each row's height roughly in half while keeping all text, badges, and buttons fully readable.

The change applies to:
- All guest data rows (every `TableCell` inside the guest `.map()` loop)
- This covers all current and future guests since it's part of the rendering template

### What Does NOT Change
- Table header row (stays the same height)
- Group header rows (Family/Couple banners stay the same)
- No column widths, fonts, or content changes
- No other pages or features affected
