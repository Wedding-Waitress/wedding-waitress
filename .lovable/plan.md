
# Two Changes to "Update Your Information" Modal

## Summary
Two styling updates to the `GuestUpdateModal.tsx` component:

## Changes

### 1. Make the title "Update Your Information" purple
**Line 196:** Add `className="text-primary"` to the `DialogTitle` so the header text renders in the app's purple color.

### 2. Make the Cancel button red with white text
**Lines 324-330:** Change the Cancel button from `variant="outline"` to a red background with white text (`bg-red-500 hover:bg-red-600 text-white`), matching the same font size as the "Save Changes" button beside it. The button keeps its rounded-full (tablet) shape.

**File:** `src/components/GuestLookup/GuestUpdateModal.tsx`

No other changes.
