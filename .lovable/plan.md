
# Fix Public Add Guest Modal - 3 Issues

## Changes (all in `src/components/GuestLookup/PublicAddGuestModal.tsx`)

### 1. Subtitle text overlap with close button
Move the subtitle line ("Choose if they are an individual...") to align left with form fields by adding `pr-12` (right padding) so it doesn't collide with the close button circle. Also ensure the close button is properly circular by adding explicit `aspect-square` and increasing size slightly.

### 2. Guest Type Selector requires selection (mark as required)
Add a red asterisk (*) next to a label above the Individual/Couple/Family selector, similar to how "First Name *" is displayed. Add a new Label line above the selector: "Guest Type *".

### 3. Footer buttons - make inline and scrollable (not fixed)
Remove the `DialogFooter` wrapper (which pins buttons to the bottom on mobile) and replace it with a simple inline `div` inside the scrollable content area, placed after the Notes field. Use `flex` with Cancel on the left and Add Guest on the right, both on the same row. Make them wider pill buttons (not tiny `size="xs"`).

## Technical Details

- **Line 169**: Keep `DialogContent` as-is
- **Line 171**: Update close button classes to ensure perfect circle: add `aspect-square` 
- **Line 180**: Add `pr-12` to the subtitle `<p>` tag so text wraps before reaching the close button
- **Lines 187-229**: Add a `Label` with "Guest Type *" above the selector div
- **Lines 440-449**: After the Notes `div`, add a new `div` with `flex gap-3 pt-3` containing Cancel (left) and Add Guest (right) buttons side by side
- **Lines 452-473**: Remove the `DialogFooter` block entirely since buttons are now inside the scrollable area
