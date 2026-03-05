

## Plan: Add "Edit in Canva" to Invitations Section

### Overview
Add an optional "Edit in Canva" button next to the invitation preview that opens a Canva template link in a new tab. Each artwork/design stores an optional `canva_template_url` field. The button only appears when a URL is set.

### Changes

#### 1. Database: Add column to `invitation_card_settings`
- Add `canva_template_url` (text, nullable) column to the `invitation_card_settings` table via Supabase SQL.

#### 2. Hook: `src/hooks/useInvitationCardSettings.ts`
- Add `canva_template_url` to the `InvitationCardSettings` interface (string | null).
- Include it in default values and ensure it's read/written during CRUD operations.

#### 3. Preview: `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`
- Below (or above) the preview card, conditionally render an "Edit in Canva" button when `settings.canva_template_url` is set.
- Button opens the URL in a new tab via `window.open(url, '_blank')`.
- Below the button, show the helper text: *"Want more design freedom? Click 'Edit in Canva' to customise this invitation using Canva's full editor. After downloading your design as PNG or PDF, return here and upload your finished invitation."*

#### 4. Customizer: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- In the Design or Background tab, add a "Canva Template URL" input field where the user (admin/host) can paste a Canva template link.
- On change, persist via `onSettingsChange({ canva_template_url: value })`.

#### 5. No other changes
- Existing editor, font settings, and preview system remain untouched.
- No Canva API integration — just a link opener.

