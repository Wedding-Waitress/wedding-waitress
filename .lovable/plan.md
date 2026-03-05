

## Plan: Remove Card Size block from Background tab

### Summary
Delete the Card Size block (label, A4 badge, and helper text) that was inserted between the Choose File/Image Gallery buttons and the Edit with Canva button in the Background tab.

### File Changes

#### `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- **Delete lines 428-434**: Remove the entire `<div className="mt-3">` block containing the Card Size label, A4 badge, and helper text.
- Result: The "Edit with Canva" button sits directly below the Choose File / Image Gallery row with just the existing `mt-2` gap.

