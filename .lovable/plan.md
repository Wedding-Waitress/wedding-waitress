

## Plan: Move and restyle "Edit with Canva" button

### Problem
The "Edit with Canva" button is currently a small outline button below the preview card on the right side — it's nearly invisible. The user's mockup shows it should be a large, prominent purple button in the **left-side customizer panel** (Background tab), below the Choose File / Image Gallery buttons.

### Changes

#### 1. Remove from Preview: `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`
- Remove lines 128-141 (the entire "Edit in Canva" section: button + helper text).

#### 2. Add to Customizer: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- In the **Background** tab, below the "Choose File" and "Image Gallery" buttons, add:
  - A prominent purple/gradient "Edit with Canva" button (matching the app's brand style) with the ExternalLink icon.
  - Below it, the helper text: *"Want more design freedom? Click 'Edit with Canva' to customise your invitation using Canva. After downloading your design as PNG or PDF, return here and upload it to Wedding Waitress."*
- Button opens `https://www.canva.com` in a new tab.

No other changes needed.

