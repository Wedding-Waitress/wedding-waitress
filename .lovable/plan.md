

## Add Green/Red Border Boundary Indicator on Master Card

### Approach
Add an overflow detection system to the master (first) card's front half. After every render triggered by font size, font family, position, or styling changes, measure whether the guest name and table/seat text elements overflow the front half container (49.5mm × 105mm). Display a colored border and status message accordingly.

### Detection logic
- Use `useEffect` + `useLayoutEffect` with refs on the front-half container and text elements
- After each render, call `getBoundingClientRect()` on the front-half container and each text element
- If any text element's rect extends beyond the container's rect → overflow detected → red state
- If all text fits → green state
- Re-check on every change to: `currentSettings`, `committedOverrides`, `draftOverrides`, `overlayKey`

### Visual treatment
- **Green state**: 2px solid green border on master card's front half, with a small banner below: "✓ Text is perfectly positioned. Changes will apply to all cards."
- **Red state**: 2px solid red border with a CSS `pulse` animation (glow effect), banner: "⚠️ Text is outside the card boundary. Please reduce font size or reposition the text."
- Only shown on the master card (first card on active page), not on slave cards or print view
- Banner sits just below the master card, outside the card dimensions so it doesn't affect layout

### Files to modify
- **`src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**:
  - Add `textOverflowing` state (boolean)
  - Add refs to the two text elements inside `renderPlaceCard` when `isInteractive`
  - Add a `useEffect` that runs overflow detection after renders
  - Apply conditional border style to the front-half container (`height: 49.5mm` div) on the master card
  - Add status banner below the master card in the grid rendering

- **`src/index.css`** (or inline keyframes): Add a subtle red pulse/glow animation for the warning state

### What stays untouched
- InteractiveTextOverlay internals
- Master-slave mirroring, positioning math, persistence pipeline
- Print/export rendering
- Slave card styling

