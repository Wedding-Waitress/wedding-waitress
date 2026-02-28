

# Refine Dialog Close Button: Even Smaller Circle, Thicker Border, Larger Cross

## What's Changing
The round purple close button circle will be reduced further, the border made thicker, and the X cross made larger:

- Circle: from 20px (w-5 h-5) down to **16px (w-4 h-4)**
- Border: from `border-2` to **`border-[3px]`** (thicker purple outline)
- X icon: from 16px (h-4 w-4) up to **18px (h-[18px] w-[18px])**

## Technical Detail

**File:** `src/components/ui/dialog.tsx` (line 81)

- Change container from `w-5 h-5` to `w-4 h-4`
- Change `border-2` to `border-[3px]`
- Change X icon from `h-4 w-4` to `h-[18px] w-[18px]`

Single line change in the global dialog component -- applies to every pop-up across the app.

