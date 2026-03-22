

## Enforce 5mm Safe Zone on All Place Cards

### Problem
Text (guest name and table/seat) can overflow past card edges because the current positioning uses `left: 0; width: 100%` with `whiteSpace: nowrap`, allowing long names to extend beyond boundaries.

### Approach
Replace the full-width + asymmetric-padding positioning model with a centered safe-zone container that enforces 5mm margins on all four sides. Text that exceeds the safe zone will be truncated with ellipsis.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

**1. Update `buildAbsoluteStyle` (lines 385-407)**

Replace the current `left: 0; width: 100%` + padding-based offset approach with:
```tsx
left: '50%',
transform: `translateX(-50%) translateY(-50%) rotate(${pos.rotation}deg)`,
width: '95mm',       // 105mm - 5mm left - 5mm right
maxWidth: '95mm',
textAlign: 'center',
whiteSpace: 'nowrap',
overflow: 'hidden',
textOverflow: 'ellipsis',
```

Horizontal offsets will shift the `left` percentage rather than using asymmetric padding:
- `left: calc(50% + ${xShiftMm}mm)` where `xShiftMm = (pos.x - 50) / 100 * CARD_WIDTH_MM`

**2. Clamp vertical positioning**

Ensure `top` percentage keeps text within the 5mm top/bottom margins of the front half (49.5mm). The 5mm margin = ~10.1% of 49.5mm, so clamp `pos.y` to `[10, 90]%` range.

**3. Apply to all cards (master + slaves)**

Since `buildAbsoluteStyle` is shared by both interactive (master) and passive (slave) cards, the change automatically applies everywhere.

**4. Update boundary clamping constants (lines 215-216)**

Tighten `MAX_OFFSET_X_MM` and `MAX_OFFSET_Y_MM` to respect the 5mm margins:
- `MAX_OFFSET_X_MM`: reduce from 47 to ~42.5mm (keeps text center within 5mm-100mm range)
- `MAX_OFFSET_Y_MM`: adjust to prevent top/y from going outside 5mm boundaries

### What stays untouched
- InteractiveTextOverlay internals (locked)
- Master-slave mirroring architecture
- Persistence pipeline, committed/draft overrides
- Back half (message) layout
- Decorative image layout
- Print/export rendering

