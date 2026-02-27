
# Edit Event Modal Header Tweaks

## Changes

### 1. Shorten the event name input field width
**File:** `src/components/Dashboard/EventEditModal.tsx` (line 300)

Change the wrapper `<div className="flex-1">` to `<div className="flex-1 max-w-[75%]">` so the input field is 75% of its current width, pulling the right edge inward by 25%.

### 2. Make the close (X) button smaller with a bolder, larger X icon
**File:** `src/components/ui/dialog.tsx` (line 81)

- Reduce circle size from `w-8 h-8` to `w-7 h-7`
- Increase the X icon from `h-4 w-4` to `h-4.5 w-4.5` (using arbitrary value `h-[18px] w-[18px]`)
- Add `stroke-[3]` to the X icon to make it bolder/thicker
