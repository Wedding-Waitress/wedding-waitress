

## Add QR Code Tab to Invitations & Cards

### Overview
Add a new "Add QR Code" tab between Background and Messages in the customizer. Users can select an event, generate a QR code, and place it on the invitation canvas with drag and resize capabilities.

### Changes

**1. Extend `InvitationCardSettings` interface** (`src/hooks/useInvitationCardSettings.ts`)
- Add `qr_config` field to the settings interface with properties: `enabled`, `x_percent`, `y_percent`, `size_percent`, `event_id` (the event whose QR to show — defaults to current event)
- Update `parseRow` to include default qr_config

**2. Add "Add QR Code" tab** (`src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`)
- Change tab grid from `grid-cols-3` to `grid-cols-4`
- Add new tab trigger "Add QR Code" between Background and Messages
- New tab content:
  - Section heading "Add QR Code to Invite" in `#7C3AED`
  - "Choose Event" dropdown populated from `useEvents()` hook
  - When event selected: generate QR using `generateInvitationQR()` and display preview
  - Toggle to enable/disable QR on canvas
  - Pass events list into the customizer props (from `InvitationsPage`)

**3. Render QR on canvas** (`src/components/Dashboard/Invitations/InvitationCardPreview.tsx`)
- Add `qr_config` + `qrDataUrl` to props
- When enabled, render QR as an `<img>` absolutely positioned on the canvas
- Wrap in a custom draggable/resizable container (similar to `InteractiveTextOverlay`) with:
  - Drag to move (updates `x_percent`, `y_percent`)
  - Four corner resize handles that scale proportionally (updates `size_percent`)
  - Default position: bottom center (~50% x, ~90% y), medium size (~15% width)
- Add callbacks `onQrMove` and `onQrResize` to sync position back to settings

**4. Wire up in `InvitationsPage.tsx`**
- Pass `events` list to customizer for the event dropdown
- Pass `qrDataUrl` state to preview (generated via `generateInvitationQR` when QR config changes)
- Handle QR position/size updates through `updateSettings`

**5. Create `InteractiveQROverlay` component** (`src/components/ui/InteractiveQROverlay.tsx`)
- Lightweight wrapper for the QR image on canvas
- Supports drag-to-move (reuses pointer event pattern from `InteractiveTextOverlay`)
- Four corner resize handles that scale `size_percent` proportionally
- Selection border and handles styled consistently with text zone overlays
- Delete button to remove QR from canvas

### Data Flow
```text
InvitationsPage
├── events (from useEvents)
├── qrDataUrl (generated when qr_config.event_id changes)
├── InvitationCardCustomizer
│   └── "Add QR Code" tab → event dropdown → toggle → updates qr_config in settings
└── InvitationCardPreview
    └── InteractiveQROverlay (draggable + resizable QR image)
        └── onQrUpdate → updates qr_config position/size in settings
```

