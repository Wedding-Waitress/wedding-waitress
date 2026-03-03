

## Changes to Invitations Design Tab

### 1. Card Size — always show A4, update helper text

**File:** `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

- **Lines 192-200**: Replace the card size display to always show "A4 (210 × 297mm)" regardless of what's stored in settings. Update the helper text to: *"Size is locked at creation and cannot be changed. If you want to print in A5, please get your printer or designer to change the size. Quality will remain the same."*

- **Line 73**: Change default `card_size` from `'A5'` to `'A4'`.

- **Lines 217-218**: In the Reset to Default handler, change `card_size` from `'A5'` to `'A4'`.

### 2. Remove Orientation selector

**File:** `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

- **Lines 202-211**: Remove the entire Orientation `<div>` block (the label + Select dropdown). Orientation will always be portrait.

### 3. Update default in preview

**File:** `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`

- **Line 31**: Change default `card_size` from `'A5'` to `'A4'`.
- **Line 32**: Keep orientation as `'portrait'` (already correct).

### Summary

Two focused edits across two files. The orientation dropdown is removed entirely from the Design tab, and the card size is hardcoded to A4 with updated guidance text.

