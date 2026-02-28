
# Reduce Dialog Close Button Size Globally

## What's Changing
The circular purple-bordered close (X) button on all dialog/modal pop-ups is slightly too large. It will be reduced from **28px (w-7 h-7)** to **24px (w-6 h-6)**, with the X icon scaled down proportionally from **18px to 14px**.

## Technical Detail

**File:** `src/components/ui/dialog.tsx` (the global dialog component used by all pop-ups)

- Change close button container from `w-7 h-7` to `w-6 h-6`
- Change X icon from `h-[18px] w-[18px]` to `h-3.5 w-3.5` (14px)

This affects every dialog/modal across the entire app since they all use this shared component.
