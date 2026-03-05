

## Plan: Restyle "Edit with Canva" button with Canva logo on its own row

### Changes

#### 1. Copy Canva logo asset
Copy `user-uploads://Screenshot_2026-03-05_161444-removebg-preview.png` to `src/assets/canva-logo.png`.

#### 2. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

- **Move** the "Edit with Canva" button out of the 3-button row back to a 2-button row (Choose File + Image Gallery).
- **Below** that row, add the "Edit with Canva" button on its own line, full width (`w-full`), with `variant="gradient"` and `rounded-full`.
- **Replace** the `ExternalLink` icon with the imported Canva logo (`<img>` element, ~20px height, rounded-full).
- **Keep** the helper text paragraph below the button.

No other files need changes.

