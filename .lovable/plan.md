

## Plan: Constrain Place Card Text Dragging to Card Boundaries

### Problem
1. The front half container has `overflow: 'visible'` (line 358), allowing text to visually escape the card
2. The mm-based clamping in `handleGuestNameMove` and `handleTableSeatMove` allows offsets up to ±52.5mm / ±24.75mm — effectively the full card width/height — meaning text can be dragged completely off the card
3. The `InteractiveTextOverlay` move handler clamps the element center within the container, but the container's `overflow: visible` means there's no visual clipping

### Changes

**File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**

1. **Line 358** — Change `overflow: 'visible'` to `overflow: 'hidden'` on the interactive front half container. This clips any text that extends beyond the card boundary visually.

2. **Lines 100-108 (`handleGuestNameMove`)** — Tighten clamping from `±CARD_WIDTH_MM/2` / `±FRONT_HEIGHT_MM/2` to approximately `±CARD_WIDTH_MM * 0.35` / `±FRONT_HEIGHT_MM * 0.35`. This keeps the text center point well within the card, preventing it from reaching the edges where it would be cut off or unreadable.

3. **Lines 129-138 (`handleTableSeatMove`)** — Apply the same tighter clamping as the guest name handler.

### Files changed: 1

