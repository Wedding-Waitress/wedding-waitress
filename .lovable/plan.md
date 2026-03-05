

## Plan: Reposition "Edit with Canva" button

### Problem
The "Edit with Canva" button is currently at the bottom of the Background tab (near Reset to Default). The user wants it immediately after the "Choose File" and "Image Gallery" buttons, styled to match the mockup screenshot — a purple/gradient button with Canva branding and helper text directly below.

### Changes

#### `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

1. **Remove** the current Canva section at lines 538-550 (the `border-t` div containing the button and helper text).

2. **Insert** the same Canva button + helper text immediately after line 459 (after the closing `</div>` of the Choose File / Image Gallery button row), before the background image preview section. The new block will be:
   - A container with the "Edit with Canva" gradient button (matching the app's purple gradient style, `variant="gradient"`, full-width, `rounded-full`).
   - Helper text below: *"Want more design freedom? Click 'Edit with Canva' to customise your invitation using Canva. After downloading your design as PNG or PDF, return here and upload it to Wedding Waitress."*

No other files need changes.

