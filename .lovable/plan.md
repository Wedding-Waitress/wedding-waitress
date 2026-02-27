
# Save The Date and Thank You Cards -- Sub-Tabs in Invitations

## Overview
Add two new card types (Save The Date, Thank You) as sub-tabs within the existing Invitations page. All three card types share the same template engine, customizer, export, and send pipeline -- only the template category filter and default text zones differ.

## Architecture Decision
**Sub-tabs within Invitations** (not separate pages) because:
- All three use identical infrastructure (template gallery, customizer, preview, exporter, send modal)
- Reduces sidebar clutter
- Templates are differentiated by a `category` field already in the database
- Zero code duplication

## What Changes

### 1. Update Invitation Templates Category Support
- The `invitation_templates` table already has a `category` field
- Add new category values: `save_the_date`, `thank_you` (existing templates use categories like `classic`, `modern`, etc.)
- Add a new column `card_type` to `invitation_templates` with values: `invitation` (default), `save_the_date`, `thank_you`
- This separates the card type from the visual style category (a Save The Date can be "modern" or "floral" style)

### 2. Update `InvitationsPage.tsx` -- Add Sub-Tab Navigation
- Add a tab bar at the top with three tabs: "Save The Date", "Invitation", "Thank You"
- Each tab filters the template gallery by `card_type`
- Update the page title/description dynamically based on active tab
- Pass `cardType` to the template gallery for filtering

### 3. Update `TemplateGallery.tsx` -- Filter by Card Type
- Accept a `cardType` prop
- Filter templates by `card_type` field
- Show appropriate empty state message per tab (e.g., "No Save The Date templates yet")

### 4. Update `useInvitationTemplates.ts` -- Support Card Type Filtering
- Add optional `cardType` parameter to the hook
- Filter query by `card_type` when provided

### 5. Update Admin Template Uploader
- Add a "Card Type" selector (Save The Date / Invitation / Thank You) to the admin template creation form
- This lets the admin assign templates to the correct tab when uploading

### 6. Default Text Zones per Card Type
When creating templates in admin, the suggested text zones differ:
- **Save The Date**: `couple_names`, `date`, `venue` (minimal -- 3 zones)
- **Invitation**: `couple_names`, `date`, `venue`, `time`, `dress_code`, `rsvp_details`, `guest_name` (detailed -- 7 zones)
- **Thank You**: `couple_names`, `message`, `guest_name` (simple -- 3 zones)

These are just guidance for the admin when creating templates. The customizer handles any number of zones dynamically.

## Files Changed

| File | Change |
|------|--------|
| Database migration | Add `card_type` column to `invitation_templates` (default: `invitation`) |
| `src/hooks/useInvitationTemplates.ts` | Add `cardType` filter parameter |
| `src/components/Dashboard/Invitations/InvitationsPage.tsx` | Add sub-tab navigation bar, pass `cardType` to gallery |
| `src/components/Dashboard/Invitations/TemplateGallery.tsx` | Accept and apply `cardType` filter |
| Admin template form (in Admin panel) | Add Card Type selector dropdown |

## UI Layout

```text
+--------------------------------------------------+
|  Invitations & Cards                              |
|  Choose an event: [dropdown]                      |
|                                                   |
|  [ Save The Date ]  [ Invitation ]  [ Thank You ] |
|  ──────────────────────────────────────────────── |
|                                                   |
|  Template Gallery (filtered by active tab)         |
|  [card] [card] [card] [card]                      |
+--------------------------------------------------+
```

## No Changes Needed
- `InvitationCustomizer.tsx` -- already handles any number of text zones dynamically
- `InvitationPreview.tsx` -- renders whatever zones the template defines
- `InvitationExporter.tsx` -- exports whatever is on the preview
- `InvitationSendModal.tsx` -- sends whatever is rendered
- `invitationQR.ts` -- QR code works identically for all card types
