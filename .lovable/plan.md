

# Style Updates for Edit Event Modal

## 3 Changes

### 1. EventNameCombobox Cancel button -- red background, white text
**File:** `src/components/Dashboard/EventNameCombobox.tsx` (line 130-141)

Change the Cancel button from `variant="ghost"` to `variant="destructive"` with `bg-red-500 hover:bg-red-600 text-white` classes. This affects both the Ceremony Name and Reception Name dropdowns since they share the same component.

### 2. Dialog close button (X) -- centered purple circle
**File:** `src/components/ui/dialog.tsx` (line 81-85)

Replace the default close button styling with a circular design:
- Add `rounded-full border-2 border-primary` for the purple circle border
- Add `flex items-center justify-center w-8 h-8` for centering and sizing
- Change the X icon color to `text-primary` (purple)
- Keep `opacity-100` instead of `opacity-70` so it's clearly visible

This matches the existing Guest Live View modal close button standard (from memory: circular, thick purple border, purple X, centered).

### Files Modified
1. `src/components/Dashboard/EventNameCombobox.tsx` -- Cancel button styling
2. `src/components/ui/dialog.tsx` -- Close (X) button styling

