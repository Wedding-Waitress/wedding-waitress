
# Fix Public Add Guest Modal Spacing & Close Button

## Changes (all in `src/components/GuestLookup/PublicAddGuestModal.tsx`)

### 1. Close Button -- Purple Circle with White X
Override the default DialogContent close button by adding a custom close button inside the modal. This will be a purple-filled circle with a purple border, containing a larger white X icon. The default close button from DialogContent will be hidden using CSS.

- Add a custom `DialogPrimitive.Close` button positioned at top-right
- Style: `w-9 h-9 rounded-full bg-primary border-2 border-primary` with a white X icon (`w-5 h-5 text-white`)
- Hide the default close button via a `[&>button:last-child]:hidden` class on DialogContent (or use the existing close button override pattern)

### 2. Subtitle Text -- Move Down Below Close Button
Add top margin/padding to the subtitle paragraph (`mt-2` or `pt-1`) so the text "Choose if they are an individual, your partner, or a family member." sits below the close button and doesn't overlap.

### 3. Horizontal Padding -- Add Side Gaps to All Fields
Increase the horizontal padding on the scrollable content area from the current minimal padding to `px-4 sm:px-6` so all fields (guest type selector, inputs, dropdowns, notes, and footer buttons) have visible gaps from the edges. The DialogContent already has `px-4 sm:px-10` but the inner content needs its own padding to create visible breathing room on mobile.

- Add `px-3 sm:px-2` to the inner `div` wrapping all form fields (line 178)
- This ensures the guest type selector, all input rows, notes, and buttons are indented from both edges

## Technical Summary
- **File**: `src/components/GuestLookup/PublicAddGuestModal.tsx`
- Add custom purple circle close button with white X
- Add `mt-2` to subtitle text
- Add horizontal padding (`px-3`) to the scrollable form content area
