

## Fix Place Cards Drag-and-Drop — Correct Coordinate System

### Root Cause

The `InteractiveTextOverlay` component is designed for **absolutely-positioned elements** with percentage-based `left`/`top` values (as used in the Invitations editor). The Place Cards preview instead uses **relative positioning inside a flex container** with mm-based transforms. This mismatch causes:

- **Jumping on click**: The overlay forces `position: absolute` but `el.style.left/top` are unset (read as 0), so the element jumps to the container origin
- **Inaccurate drag**: `initLeft`/`initTop` start at 0 instead of the element's actual position
- **Wrong drop position**: On pointer up, the overlay writes percentage `left`/`top` values that don't account for the original flex-layout position

### Solution

Switch place card text elements to **absolute positioning with percentage-based coordinates** — the same pattern the Invitations editor uses successfully. Convert mm offsets to/from percentages for storage.

### Changes — `PlaceCardPreview.tsx`

**1. Compute absolute positions as percentages**

Default positions (center of front half):
- Guest Name: `left: 50%`, `top: ~25%` of front half (centered)
- Table & Seat: `left: 50%`, `top: ~70%` of front half

Convert stored mm offsets to percentage adjustments:
```ts
const guestXPct = 50 + ((currentSettings.guest_name_offset_x ?? 0) / CARD_WIDTH_MM) * 100;
const guestYPct = 25 + ((currentSettings.guest_name_offset_y ?? 0) / FRONT_HEIGHT_MM) * 100;
```

**2. Use absolute positioning with `left`/`top` percentages**

Replace the current flex-based layout for interactive elements with absolute positioning inside the front-half container:
```tsx
style={{
  position: 'absolute',
  left: `${guestXPct}%`,
  top: `${guestYPct}%`,
  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  ...fontStyles,
}}
```

This matches `computeZoneStyle` from Invitations — the overlay reads `el.style.left/top` correctly.

**3. Fix `handleInteractiveMove`**

The overlay returns percentage deltas relative to the container. Convert to mm for storage:
```ts
const handleInteractiveMove = (element, dxPct, dyPct) => {
  const dxMm = (dxPct / 100) * CARD_WIDTH_MM;
  const dyMm = (dyPct / 100) * FRONT_HEIGHT_MM;
  // Add to current mm offsets and save
};
```
This part already exists and is correct — only the positioning/style setup needs fixing.

**4. Keep static (non-interactive) cards unchanged**

Only the first card uses absolute positioning when `textEditMode` is on. All other cards and the non-interactive rendering continue using the existing flex layout with mm-based transforms, ensuring no visual regression.

**5. Front-half container must be the `containerRef`**

Ensure `firstCardRef` points to the front-half div (it already does), and that this div has `position: relative` and `overflow: hidden` to constrain dragging within card boundaries.

### Files Modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — switch interactive elements to absolute percentage positioning matching the Invitations pattern

