

# Fix Dialog Close Button: Smaller Circle, Larger Cross

## What's Changing
The previous edit made the X icon smaller and the circle smaller -- but you only wanted the **circle border reduced**, not the X. This fix will:

- Make the round button circle **smaller** (from 24px down to 20px)
- Make the X cross inside **larger** (back up from 14px to 16px)

## Technical Detail

**File:** `src/components/ui/dialog.tsx`

- Change container from `w-6 h-6` (24px) to `w-5 h-5` (20px) -- smaller circle
- Change X icon from `h-3.5 w-3.5` (14px) to `h-4 w-4` (16px) -- larger cross

This is the global dialog component used by every pop-up across all pages.

