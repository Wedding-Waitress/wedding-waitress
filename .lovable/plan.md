

## Plan: Interactive Drag, Resize & Rotate for Invitations and Place Cards

### Overview
Replace slider-based positioning with direct manipulation on both the Invitations preview and the Place Cards preview. Users click text to select, drag to move, pull handles to resize, and use a rotation handle to angle text. Sliders are replaced with read-only indicators. Both systems share a reusable interaction component.

### Architecture

```text
  ↻  (rotation handle — drag to rotate)
  |
┌──●──────────────●──┐
│   Selected Zone    │  ← drag body to move
└──●──────────────●──┘
   (resize handles on left/right edges)
```

A shared `<InteractiveTextOverlay>` component handles the pointer math for drag, resize, and rotate. Both Invitations and Place Cards import it.

### Part 1: Shared Interactive Component

**New file: `src/components/ui/InteractiveTextOverlay.tsx`**

A wrapper that renders around any selected text element and provides:
- **Move**: Pointer down on body → track delta → callback with `(dx%, dy%)`
- **Resize**: Pointer down on left/right edge handles → track horizontal delta → callback with `(dWidth%)`
- **Rotate**: Pointer down on top circle handle → calculate angle from element center → callback with `(degrees)`
- Visual: dashed blue border, small square handles on edges, circular handle above connected by a line
- Click outside deselects (document-level listener)

### Part 2: Invitations & Cards

**2a. Add `rotation` to TextZone** (`src/hooks/useInvitationCardSettings.ts`)
- Add `rotation: number` to `TextZone` interface (default `0`)

**2b. Make `InvitationCardPreview.tsx` interactive**
- Add state: `selectedZoneId`
- Remove `pointer-events-none` from text zone divs
- On click → select zone, show `InteractiveTextOverlay`
- On drag → update `x_percent` / `y_percent` (convert px delta to % using container rect)
- On edge resize → update `width_percent`
- On rotate → update `rotation`
- Apply `transform: rotate(${zone.rotation || 0}deg)` to each zone
- Lift `onZoneUpdate` callback to parent to persist changes
- Click on empty area → deselect

**2c. Update `InvitationCardCustomizer.tsx`**
- Remove the three sliders (Horizontal Position, Vertical Position, Width) — lines 304-343
- Replace with read-only position indicators (X: 50%, Y: 16%, W: 80%)
- Add rotation display with reset button (e.g., "Rotation: 15° [↺ Reset]")
- Add `rotation: 0` to `createDefaultZone`
- Sync selection: clicking a zone in the customizer list also highlights it on the preview
- Pass `selectedZoneId` and handlers to the preview

**2d. Update exporter** (`src/lib/invitationExporter.ts`)
- Apply `transform: rotate(${rotation}deg)` when building text zone elements (line ~79)
- Ensure `transform-origin: center center` so rotation pivots correctly

### Part 3: Name Place Cards

Place Cards have a fundamentally different layout — fixed card slots with guest name + table/seat positioned via mm offsets. The interactive approach here:

**3a. Add rotation fields to PlaceCardSettings** (`src/hooks/usePlaceCardSettings.ts`)
- Add `guest_name_rotation?: number` and `table_seat_rotation?: number` (default `0`)

**3b. Database migration**
- Add `guest_name_rotation` and `table_seat_rotation` columns to `place_card_settings` table (default `0`)

**3c. Make `PlaceCardPreview.tsx` interactive**
- Add a `selectedElement` state: `'guest_name' | 'table_seat' | null`
- Make guest name and table/seat divs clickable → selects them
- When selected, wrap with `InteractiveTextOverlay`:
  - **Guest name**: drag updates `guest_name_offset_x/y` (convert px to mm using card dimensions)
  - **Table/seat**: drag updates `table_offset_x/y`
  - Rotate updates `guest_name_rotation` or `table_seat_rotation`
  - Resize not applicable for place cards (font size controls width)
- Apply `transform: rotate(Xdeg) translate(Xmm, Ymm)` to each element
- Only interactive on first card in current page (other cards mirror the settings)

**3d. Update `PlaceCardCustomizer.tsx`**
- In the "Text Position" tab, keep the mm offset sliders (they're already precise and work well for print)
- Add rotation display with reset for guest name and table/seat sections
- Sync selection between customizer and preview
- Add `rotation: 0` reset to the "Reset Positions" button

**3e. Update `PlaceCardExporter.tsx`**
- Apply rotation transforms to guest name and table/seat elements during export

### Files Changed
- **New**: `src/components/ui/InteractiveTextOverlay.tsx`
- **Migration**: Add `guest_name_rotation`, `table_seat_rotation` to `place_card_settings`
- `src/hooks/useInvitationCardSettings.ts` — add `rotation` to TextZone
- `src/hooks/usePlaceCardSettings.ts` — add rotation fields
- `src/components/Dashboard/Invitations/InvitationCardPreview.tsx` — interactive drag/resize/rotate
- `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` — remove sliders, add read-only indicators + rotation
- `src/lib/invitationExporter.ts` — apply rotation in export
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — interactive drag/rotate on guest name + table/seat
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx` — add rotation controls
- `src/components/Dashboard/PlaceCards/PlaceCardExporter.tsx` — apply rotation in export

