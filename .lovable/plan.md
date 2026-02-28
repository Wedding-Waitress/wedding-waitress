

# Rebuild Invitations Page to Mirror Place Cards Architecture

## Overview

Replace the current template-based Invitations page with a Place-Cards-style architecture. The new page will have the same layout, gallery system, and customizer panel structure, but adapted for A4/A5 invitations with editable text zones instead of guest names/table info.

## Page Layout (mirrors PlaceCardsPage.tsx exactly)

### Top Card (Header Box)
- **Title:** "Invitations and Cards"
- **Subtitle:** "Create professional A4-A5 invitations, save the date, and thank you cards for you to send to your guest digitally and download to print"
- **Green stats box:** "Manage your A4-A5 invitations and cards" with the same 5 info bullet lines adapted for invitations (300 DPI, PDF dimensions, etc.)
- **Choose Event dropdown** on the left (no Table dropdown needed)
- **Export Controls** box on the far right: "Export Controls" / "Download your invitations as PDF ready for printing." / One green-bordered button: "Download PDF"

### Bottom Section (Two-Column Grid, same as Place Cards)
- **Left panel (2/5 width):** "Invitations and Cards" customizer box (copied from Custom Name Place Cards structure)
- **Right panel (3/5 width):** Live preview of the invitation

## Customizer Panel ("Invitations and Cards" box)

Copied from `PlaceCardCustomizer` with these tabs adapted:

- **Design** -- Font pickers (using PlaceCardFontPicker), font size, font color, bold/italic/underline, text case
- **Text Zones** (replaces "Position") -- Manage text zones on the invitation:
  - Preset zones available: Event Name, Event Date, Event Location, Couple Names, RSVP Deadline
  - Each preset auto-fills from event data but can be overridden
  - "Add Custom Zone" button to add a free-text zone with custom content
  - Each zone has: label, text content, font family, font size, font color, position (X/Y sliders), width
  - Zones can be removed/reordered
- **Background** -- Same as Place Cards: image type radio (none / full background), upload button, Image Gallery button, background color, opacity/position controls
- **Messages** -- For now, a simple notes/caption area (can be expanded later)

## Image Gallery

- Create a new `invitation_gallery_images` Supabase table (identical structure to `place_card_gallery_images`: id, name, category, image_url, sort_order, created_at)
- Create `InvitationGalleryModal` component (copy of `PlaceCardGalleryModal` but reading from the new table)
- Gallery displays 5 large invitation images per row (matching the current invitation template display size)
- Search bar, category tabs, View/Select hover buttons -- all identical to Place Cards gallery

## Database Changes

### New table: `invitation_gallery_images`
```sql
CREATE TABLE invitation_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: public read, admin write (same as place_card_gallery_images)
ALTER TABLE invitation_gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view gallery images" ON invitation_gallery_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage gallery images" ON invitation_gallery_images FOR ALL USING (has_role(auth.uid(), 'admin'));
```

### New table: `invitation_card_settings`
Stores per-event invitation customization (like `place_card_settings`):
```sql
CREATE TABLE invitation_card_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  background_color text NOT NULL DEFAULT '#ffffff',
  background_image_url text,
  background_image_type text NOT NULL DEFAULT 'none',
  background_image_x_position integer DEFAULT 50,
  background_image_y_position integer DEFAULT 50,
  background_image_opacity integer DEFAULT 100,
  text_zones jsonb NOT NULL DEFAULT '[]',
  font_color text NOT NULL DEFAULT '#000000',
  card_size text NOT NULL DEFAULT 'A5',
  orientation text NOT NULL DEFAULT 'portrait',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: owner-only CRUD (same as place_card_settings)
```

The `text_zones` JSONB column stores an array of zone objects:
```json
[
  {
    "id": "zone-1",
    "label": "Couple Names",
    "type": "preset",
    "preset_field": "couple_names",
    "text": "",
    "font_family": "Inter",
    "font_size": 36,
    "font_color": "#000000",
    "font_weight": "normal",
    "font_style": "normal",
    "text_align": "center",
    "text_case": "default",
    "x_percent": 50,
    "y_percent": 30,
    "width_percent": 80
  }
]
```

## New Files

1. **`src/hooks/useInvitationGallery.ts`** -- Hook to fetch from `invitation_gallery_images` (copy of `usePlaceCardGallery`)
2. **`src/hooks/useInvitationCardSettings.ts`** -- Hook for CRUD on `invitation_card_settings` (similar to `usePlaceCardSettings`)
3. **`src/components/Dashboard/Invitations/InvitationGalleryModal.tsx`** -- Gallery modal (copy of `PlaceCardGalleryModal`, reads from new table, 5 large images per row)
4. **`src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`** -- Left-panel customizer with Design, Text Zones, Background, Messages tabs
5. **`src/components/Dashboard/Invitations/InvitationCardPreview.tsx`** -- Right-panel live preview showing the invitation with text zones overlaid on background

## Modified Files

- **`src/components/Dashboard/Invitations/InvitationsPage.tsx`** -- Complete rewrite to mirror `PlaceCardsPage` layout (header card with stats, event selector, export controls, two-column bottom grid)
- Old components (`TemplateGallery.tsx`, `InvitationCustomizer.tsx`, `InvitationPreview.tsx`, `InvitationExporter.tsx`, `InvitationSendModal.tsx`) will be kept but unused for now (can be cleaned up later)

## Text Zone System

- **Preset zones** come pre-configured with event data mapping (couple_names, date, venue, etc.) but the text is always editable
- **Custom zones** are blank zones the user adds manually and types whatever they want
- Each zone is independently styled (font, size, color, position)
- Zones are rendered as absolutely-positioned overlays on the background image in the preview
- The same zone data drives the PDF export engine
