

## Plan: Simplify "Edit with Canva" button

### Changes

#### 1. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- **Remove** lines 538-550 (the Canva Template URL input field and its label/helper text).

#### 2. `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`
- **Replace** lines 128-143: Remove the conditional on `canva_template_url`. Always show the "Edit with Canva" button.
- Button opens `https://www.canva.com` in a new tab (no user-provided URL needed).
- Update helper text to: *"Want more design freedom? Click 'Edit with Canva' to customise your invitation using Canva. After downloading your design as PNG or PDF, return here and upload it to Wedding Waitress."*

#### 3. No database changes needed
The `canva_template_url` column can remain — it's unused but harmless.

