

## Resize Dialog Close Button

**File:** `src/components/ui/dialog.tsx`

**Change:** On the close button element (~line 79):
- Reduce circle size from `w-4 h-4` to `w-2 h-2` (8px)
- Double border thickness from `border-[3px]` to `border-[6px]`
- Scale down the X icon proportionally from `h-[18px] w-[18px]` to `h-[9px] w-[9px]`

Single line edit in the shared Dialog component — applies globally to all popups.

