

## Plan: Move "Edit with Canva" inline with Choose File & Image Gallery

### Changes

#### `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

1. **Remove** the separate Canva section (lines 461-473) — the `div.space-y-3.mt-3` containing the Canva button and helper text.

2. **Modify** the button row at lines 439-459: Change from a 2-button `flex gap-2` row to a 3-button row. Add "Edit with Canva" as a third button with the same `flex-1 rounded-full` styling, using `variant="gradient"` and an `ExternalLink` icon. It opens `https://www.canva.com` in a new tab.

3. **Add helper text** immediately after the 3-button row (before the background image preview): A `<p>` with the text *"Want more design freedom? Click 'Edit with Canva' to customise your invitation using Canva. After downloading your design as PNG or PDF, return here and upload it to Wedding Waitress."*

No other files need changes.

