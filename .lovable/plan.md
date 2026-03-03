

## Fix Dialog Close Button Size

**File:** `src/components/ui/dialog.tsx` (line 81)

**Changes:**
1. Remove `touch-target` class from the close button — this is overriding the 8px size
2. Increase X icon from `h-[9px] w-[9px]` to `h-[12px] w-[12px]`

Single line edit, applies globally.

