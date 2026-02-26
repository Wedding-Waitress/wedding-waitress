

# Invitations Feature — Canva-Style Template Engine

## Overview
Build a full "Invitations" page in the Wedding Waitress dashboard where couples select from admin-uploaded background artwork templates, customise text fields (with full font/colour/size control), preview their invitation live, and export or share it. The admin sets up text field positions using a visual drag-and-drop editor per template.

---

## Phase 1: Database & Storage Foundation

### New Tables (via migration)

**`invitation_templates`** — Admin-managed template library
- `id` (uuid, pk)
- `name` (text) — e.g. "Rustic Garden"
- `category` (text) — e.g. "Floral", "Modern", "Classic"
- `orientation` (text) — "portrait" or "landscape"
- `width_mm` (numeric) — template width (148 for portrait A5, 210 for landscape)
- `height_mm` (numeric) — template height (210 for portrait, 148 for landscape)
- `background_url` (text) — URL to background artwork in Supabase Storage
- `thumbnail_url` (text, nullable) — smaller preview image
- `text_zones` (jsonb) — array of text field definitions with positions (see below)
- `default_styles` (jsonb) — default font, colour, size presets for this template
- `is_active` (boolean, default true)
- `sort_order` (integer, default 0)
- `created_at` (timestamptz)

**`invitation_designs`** — User's saved customisations
- `id` (uuid, pk)
- `user_id` (uuid, fk auth.users)
- `event_id` (uuid, fk events)
- `template_id` (uuid, fk invitation_templates)
- `custom_text` (jsonb) — user's text values per zone (keyed by zone ID)
- `custom_styles` (jsonb) — user's font/colour/size overrides per zone
- `include_guest_name` (boolean, default false) — personalise per guest
- `include_qr_code` (boolean, default false) — embed event QR
- `qr_position` (jsonb, nullable) — x, y, size for QR code placement
- `created_at`, `updated_at` (timestamptz)

### Text Zone JSON Structure
Each zone in `text_zones` will look like:
```text
{
  "id": "couple_names",
  "label": "Couple Names",
  "type": "auto" | "custom" | "guest_name",
  "auto_field": "couple_names" | "date" | "venue" | "time" | null,
  "x_percent": 50,        // % from left
  "y_percent": 30,        // % from top
  "width_percent": 80,    // % of template width
  "max_lines": 2,
  "default_text": "John & Jane",
  "font_family": "Playfair Display",
  "font_size": 28,
  "font_weight": "bold",
  "font_color": "#333333",
  "text_align": "center",
  "letter_spacing": 2
}
```

### Storage
- Use existing **`invitations`** bucket (already exists, public) for template backgrounds and exported images.

### RLS Policies
- `invitation_templates`: Public read (all users can browse), admin-only write
- `invitation_designs`: Users can CRUD their own designs only

---

## Phase 2: Admin Template Setup (Visual Drag-and-Drop Editor)

### Admin Page Addition
Add an "Invitation Templates" management section accessible from the admin panel (`/admin`).

### Template Upload Flow
1. Admin uploads background artwork (no text) to the `invitations` storage bucket
2. Admin sets template name, category, orientation
3. Visual editor opens showing the background at correct A5 proportions
4. Admin drags and positions text zone rectangles on the canvas
5. For each zone: set label, type (auto-fill, custom, or guest name), default font/colour/size
6. Save template with all zone positions stored as percentages (responsive)

### Visual Editor Implementation
- Use a canvas-based approach (the project already has `fabric` installed)
- Show the background image at A5 proportions
- Draggable/resizable text boxes for each zone
- Property panel on the side for font, size, colour, alignment per zone
- Preview button to see how it looks with sample data

---

## Phase 3: Couple-Facing Invitations Page

### Sidebar Entry
Add to `AppSidebar.tsx`:
- ID: `"invitations"`
- Label: `"Invitations"`
- Icon: `Mail` (from lucide-react, already imported)
- Position: after "QR Code Seating Chart" in the menu

### Dashboard Tab
Add `case 'invitations'` to `renderTabContent()` in `Dashboard.tsx`.

### Page Layout (3-Step Flow)

**Step 1: Choose Template**
- Browse templates in a responsive grid grouped by category
- Each card shows thumbnail, name, orientation badge
- Click to select and proceed to Step 2

**Step 2: Customise**
- Left panel: Live preview of invitation with background + text
- Right panel: Text field editor
  - Auto-filled fields (couple names, date, venue, time) shown pre-populated from event data
  - Custom text fields: free-text input areas
  - Guest name toggle: on/off
  - QR code toggle: on/off with draggable position
  - Per-field styling: font family, size, colour, weight, alignment
  - Font picker with web-safe + Google Fonts selection
  - Colour picker (reuse existing `ColorPickerPopover` component)
- Save design to `invitation_designs` table

**Step 3: Export & Share**
- Download PNG (high-res, 300 DPI using html2canvas, matching Place Cards methodology)
- Download PDF (single invitation or 2-up on A4 with crop marks using jsPDF)
- Share digitally (generate shareable image/link)
- If guest name personalisation is ON:
  - "Generate All" button: creates one invitation per guest
  - Bulk export as multi-page PDF or ZIP of PNGs
  - Preview individual guests before exporting
- Email & SMS sending (future paid upgrade, noted in UI but not built in Phase 1)

---

## Phase 4: Export Engine

### Single Invitation Export
- Render invitation at 300 DPI (matching Place Cards approach)
- Use `html2canvas` to capture the styled preview
- Output as PNG or embed in PDF via `jsPDF`

### 2-Up A4 Print Layout
- Arrange two A5 invitations on one A4 page
- Add thin crop marks at corners
- Export as print-ready PDF

### Bulk Personalised Export
- Loop through guests for the selected event
- For each guest, render their personalised invitation
- Compile into multi-page PDF or ZIP archive
- Show progress bar during generation

---

## Phase 5: Pricing Integration

### Free Starter Plan
- Can browse templates and customise
- Export limited to 3 invitations (watermarked or limited)
- Show upgrade modal when limit reached

### Paid Plans (Essential / Premium / Unlimited)
- Unlimited exports and personalisation
- No watermark

---

## Technical Details

### New Files to Create
```text
src/components/Dashboard/Invitations/
  InvitationsPage.tsx          -- Main page with 3-step flow
  TemplateGallery.tsx          -- Template browsing grid
  InvitationCustomizer.tsx     -- Text editing + styling panel
  InvitationPreview.tsx        -- Live preview renderer
  InvitationExporter.tsx       -- Export logic (PNG/PDF/bulk)
  TextZoneEditor.tsx           -- Individual text zone control
  FontPicker.tsx               -- Font selection component
  QRCodePositioner.tsx         -- Draggable QR code placement

src/components/Admin/
  InvitationTemplateManager.tsx -- Admin template CRUD
  TemplateVisualEditor.tsx      -- Drag-and-drop zone positioning

src/hooks/
  useInvitationTemplates.ts     -- Fetch/manage templates
  useInvitationDesign.ts        -- User's design CRUD

src/lib/
  invitationExporter.ts         -- PDF/PNG export utilities
```

### Files to Modify
- `src/components/Dashboard/AppSidebar.tsx` — Add "Invitations" menu item
- `src/pages/Dashboard.tsx` — Add invitations tab case + import
- `src/pages/Admin.tsx` — Add template management section (if admin panel exists)

### Dependencies
- No new dependencies needed. Uses existing: `fabric` (canvas editor), `jsPDF`, `html2canvas`, `lucide-react`, Supabase client.

---

## Build Order
1. Database migration (tables + RLS)
2. Sidebar + empty Invitations page shell
3. Admin template upload + visual editor
4. Template gallery (couple browsing)
5. Invitation customizer (text editing + live preview)
6. Export engine (PNG/PDF/2-up/bulk)
7. Pricing gate integration

This is a large feature that will be built incrementally across multiple sessions. We will start with the database foundation and page shell, then progressively add the customizer and export capabilities.

