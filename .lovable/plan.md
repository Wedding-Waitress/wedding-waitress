

## Add Floor Plan and Menu Modules to Guest Live View Configuration

### Important: What Will NOT Change

The existing Table View functionality (shown in the mobile screenshots) will remain exactly as-is. The round table visualization, seated guest list, and all current live view features (RSVP Invite, View Video, Update Your Details, Table View) are untouched.

### What's Being Added

Two new modules in the "Guest Live View Configuration" card on the QR Code Seating Chart dashboard page, and corresponding buttons/modals on the public guest live view:

1. **Floor Plan** -- couple chooses between uploading a static image OR displaying their existing ceremony/reception floor plan. Only one option can be active (mutually exclusive green-highlighted toggle cards).
2. **Menu** -- couple uploads their wedding menu (image or PDF) for guests to view.

### Database Changes

**1. New columns on `live_view_settings`:**
- `show_floor_plan` (boolean, default false)
- `show_menu` (boolean, default false)

**2. New columns on `live_view_module_settings`:**
- `floor_plan_config` (jsonb, default '{}')
- `menu_config` (jsonb, default '{}')

**3. Update RPC functions:**
- `get_public_event_with_data_secure` -- return `show_floor_plan`, `show_menu`, `floor_plan_config`, `menu_config`
- `get_public_live_view_settings` -- return `show_floor_plan`, `show_menu`

**4. New storage bucket:** `live-view-uploads` (public) for floor plan images and menu files.

### Config Data Shapes

Floor plan config:
```text
{
  "source": "upload" | "existing",
  "file_url": "https://...",
  "file_name": "venue-layout.jpg"
}
```

Menu config:
```text
{
  "file_url": "https://...",
  "file_name": "menu.pdf",
  "file_type": "image/jpeg" | "application/pdf"
}
```

### Frontend Changes

**`src/components/Dashboard/QRCode/QRCodeMainCard.tsx`**
- Add Floor Plan module card (green/red toggle, accordion with two selectable source cards)
- Add Menu module card (green/red toggle, accordion with file upload area)
- Both follow the exact same visual pattern as the existing RSVP Invite and Welcome Video cards

**`src/hooks/useLiveViewVisibility.ts`**
- Add `show_floor_plan` and `show_menu` to interface and default insert

**`src/hooks/useLiveViewModuleSettings.ts`**
- Add `floor_plan_config` and `menu_config` to interface and defaults

**`src/pages/GuestLookup.tsx`**
- Extract new settings from RPC response
- Add "Floor Plan" and "Menu" action buttons (same row as existing buttons)
- Add modals: Floor Plan shows uploaded image or existing floor plan visual; Menu shows uploaded image or PDF
- NO changes to Table View, Update Your Details, RSVP Invite, or View Video

### Files Modified

| File | Change |
|------|--------|
| New migration SQL | Add columns, update RPCs, create bucket |
| `src/hooks/useLiveViewVisibility.ts` | Add new boolean fields |
| `src/hooks/useLiveViewModuleSettings.ts` | Add new config fields |
| `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` | Add 2 new module cards |
| `src/pages/GuestLookup.tsx` | Add 2 new buttons and modals (no changes to existing features) |

