

# QR Code Positioner for Invitations

## What We're Building
Add a draggable, resizable QR code element to the invitation customizer. Couples can toggle it on, position it anywhere on the invitation by dragging, adjust its size, and it will be included in all exports (PNG, PDF, 2-up, bulk).

The QR code links to the event's public guest lookup page (`/s/{event-slug}`), using the existing `advancedQRGenerator.ts` engine.

## How It Works
- A new "QR Code" card appears in the editor sidebar (below Text Fields)
- Toggle switch to enable/disable the QR code on the invitation
- When enabled, a QR code appears on the live preview and can be dragged to reposition
- Slider controls for size (10-30% of invitation width)
- Position is stored as x/y percentages (same pattern as text zones)
- QR code is rendered in exports at full resolution

## Technical Plan

### 1. Add QR Code State to `InvitationCustomizer.tsx`
- New state: `qrConfig` with fields: `enabled`, `x_percent`, `y_percent`, `size_percent`
- Defaults: `enabled: false`, `x_percent: 85`, `y_percent: 85`, `size_percent: 15`
- Pass `qrConfig` + setter to `InvitationPreview` and `InvitationExporter`
- Include `qrConfig` in the `onSave` callback (extend its signature to accept a third argument)
- New sidebar card with toggle, size slider, and position reset button

### 2. Generate QR Code Data URL
- Create a small utility function in a new file `src/lib/invitationQR.ts`
- Uses the existing `qrcode` npm package (already installed) to generate a simple black-on-transparent QR code as a data URL
- Input: event slug; Output: PNG data URL
- Keep it simple (no need for the full `AdvancedQRGenerator` styling -- just a clean minimal QR)

### 3. Update `InvitationPreview.tsx` -- Draggable QR Overlay
- When `qrConfig.enabled` is true, render an `<img>` with the QR data URL
- Position using absolute percentages (same as text zones)
- Add mouse/touch drag handlers directly (no library needed -- simple `onMouseDown` + `onMouseMove` pattern)
- Drag updates `qrConfig.x_percent` and `qrConfig.y_percent` in real time
- Show a subtle dashed border around QR on hover to indicate it's draggable
- Accept new props: `qrConfig`, `onQrConfigChange`, `eventSlug`

### 4. Update `invitationExporter.ts` -- Include QR in Exports
- Accept optional `qrConfig` and `qrDataUrl` in `ExportOptions`
- In `buildInvitationElement`, if QR is enabled, append an `<img>` element at the correct position/size
- This ensures all export formats (PNG, PDF, 2-up, bulk) include the QR code automatically

### 5. Wire Up Event Slug
- The customizer needs the event slug to generate the QR URL
- Pass `eventSlug` from `InvitationsPage.tsx` down through the component chain
- Use `getPublicBaseUrl()` from `src/lib/urlUtils.ts` to build the full URL

### Files Changed

| File | Change |
|------|--------|
| `src/lib/invitationQR.ts` | New -- simple QR code data URL generator |
| `src/components/Dashboard/Invitations/InvitationPreview.tsx` | Add draggable QR overlay with mouse/touch handlers |
| `src/components/Dashboard/Invitations/InvitationCustomizer.tsx` | Add QR config state, sidebar controls (toggle, size slider), pass props down |
| `src/lib/invitationExporter.ts` | Include QR code image in export renders |
| `src/components/Dashboard/Invitations/InvitationExporter.tsx` | Pass qrConfig/qrDataUrl through to export functions |
| `src/components/Dashboard/Invitations/InvitationsPage.tsx` | Pass eventSlug to customizer |

### QR Config Shape
```text
{
  enabled: boolean
  x_percent: number   (0-100, center of QR)
  y_percent: number   (0-100, center of QR)
  size_percent: number (10-30, width as % of invitation)
}
```

### Drag Implementation (no library)
The preview container already has a known bounding box. The drag handler:
1. `onPointerDown` on the QR image captures start position
2. `onPointerMove` on the container computes new x/y as percentages of container dimensions
3. `onPointerUp` finalizes position
4. Clamps values to keep QR fully within bounds

This avoids adding any new dependencies and keeps the interaction lightweight.

