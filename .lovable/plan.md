

## Add Interactive Visual Editor to Place Card Preview

This is a significant feature that adds drag-to-move, drag-to-resize, and drag-to-rotate capabilities directly on the place card preview canvas, reusing the existing `InteractiveTextOverlay` component from the Invitations module.

### Architecture

The place card preview currently renders text with CSS transforms (`translate` + `rotate`) based on offset/rotation values stored in settings. The interactive editor will wrap these text elements with `InteractiveTextOverlay` when Edit Mode is on, translating drag/resize/rotate gestures into settings updates that apply globally to all cards.

Since place cards use **mm-based offsets** (not percentage-based like invitations), the interaction handlers will convert pixel deltas to mm deltas using the container's pixel-to-mm ratio.

### Changes Required

**1. `PlaceCardPreview.tsx` — Add interactive mode**

- Add new props: `isInteractive`, `selectedElement`, `onSelectElement`, `onSettingsChange`
- Add an Edit Mode toggle above the canvas (Switch component with "Edit Mode" label)
- When `isInteractive` is true and not exporting:
  - Wrap **Guest Name** div in `InteractiveTextOverlay` with move, resize (font size), rotate, and reset handlers
  - Wrap **Table/Seat Info** div in `InteractiveTextOverlay` with move, resize, rotate, and reset handlers
  - Only render interactive overlays on the **first card** on the current page (since changes apply globally, editing one card is sufficient)
- Click on canvas background deselects any selected element
- Convert pixel drag deltas to mm using: `deltaMm = deltaPx * (cardWidthMm / cardWidthPx)`
- Map interactions to settings:
  - Guest Name move → `guest_name_offset_x`, `guest_name_offset_y`
  - Guest Name rotate → `guest_name_rotation`
  - Guest Name corner resize → `guest_name_font_size`
  - Table/Seat move → `table_offset_x`, `table_offset_y`
  - Table/Seat rotate → `table_seat_rotation`
  - Table/Seat corner resize → `info_font_size`
- Reset button restores the respective element's position, rotation, and font size to defaults
- No Duplicate or Delete buttons (these are fixed elements, not custom zones)

**2. `PlaceCardsPage.tsx` — Wire up interactive props**

- Add `selectedElement` state (`'guest_name' | 'table_seat' | null`)
- Pass `isInteractive`, `selectedElement`, `onSelectElement`, and `onSettingsChange` to `PlaceCardPreview`
- The `onSettingsChange` callback is the existing `updateSettings` from `usePlaceCardSettings`

**3. No database changes needed**

All required fields (`guest_name_offset_x/y`, `table_offset_x/y`, `guest_name_rotation`, `table_seat_rotation`, `guest_name_font_size`, `info_font_size`) already exist.

**4. No changes to Text Position tab**

The existing sliders and inputs remain as precise backup controls. Both the visual editor and the Text Position panel read/write the same settings fields, so they stay in sync automatically.

### Key Technical Details

- **Pixel-to-mm conversion**: Each place card is 105mm wide. At render time, measure the actual pixel width of the card container to compute the ratio. Use `useRef` + `ResizeObserver` on the first card.
- **Edit Mode toggle**: Rendered above the pagination controls. Uses the existing `Switch` component. Default: OFF.
- **Only first card is interactive**: To avoid confusion, only the first card on the current page shows interactive overlays. All other cards are read-only but reflect changes in real-time.
- **Toolbar buttons**: Only Reset (resets position/size/rotation for that element). No Duplicate/Delete since guest name and table/seat are fixed elements.
- **Font size tooltip**: The `InteractiveTextOverlay` already shows a live `XXpx` indicator during corner resize. Will pass `currentFontSize` prop.
- **Rotation tooltip**: Already built into `InteractiveTextOverlay` — shows degree indicator during rotation.

### Estimated scope

- `PlaceCardPreview.tsx`: ~120 lines of new/modified code (interactive wrappers, edit mode toggle, conversion logic)
- `PlaceCardsPage.tsx`: ~10 lines (state + prop threading)
- No new files or database migrations

