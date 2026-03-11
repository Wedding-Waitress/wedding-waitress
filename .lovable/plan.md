

## Plan: Fix Jittery Dragging with Transform-Based Movement

### Root Cause

The jitter happens because every `pointermove` event triggers a React state update (`onMove` → `onZoneUpdate` → re-render), which repositions the element via CSS `left`/`top`. This creates a feedback loop: the element moves under the cursor, shifting the next delta calculation, causing oscillation.

### Solution

Use a **local CSS transform offset** during dragging. Only commit the final position to state on `pointerup`. This eliminates re-renders during the drag and produces perfectly smooth movement.

### Changes

**File: `src/components/ui/InteractiveTextOverlay.tsx`**

- Add `useRef` for accumulated translate offset (`{ x: 0, y: 0 }` in pixels)
- During `move` drag, instead of calling `onMove` on every pointermove:
  - Accumulate pixel deltas in the ref
  - Apply `transform: translate(Xpx, Ypx)` directly to the DOM element via `elRef.current.style.transform`
  - No React state updates during drag — zero re-renders
- On `pointerup`, convert the accumulated pixel offset to percentages and call `onMove` once, then reset the transform offset
- Add new callback prop: `onMoveEnd?: (dxPercent: number, dyPercent: number) => void` (or reuse `onMove` — called only on pointerup)
- Resize and rotate modes remain unchanged (they already work acceptably since deltas are smaller)

**File: `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`**

- No changes needed — `handleMove` already accepts `(dxPercent, dyPercent)` and applies them. It will just be called once at the end instead of on every frame.

### Technical Detail

```text
pointerdown → record startX/startY
pointermove → dx = clientX - lastX
            → accum.x += dx (pixels)
            → element.style.transform = existing + translate(accum.x, accum.y)
            → NO onMove call, NO re-render
pointerup   → convert accum to % using container rect
            → call onMove(dxPercent, dyPercent) ONCE
            → reset accum, clear inline transform
```

### Files Changed
- `src/components/ui/InteractiveTextOverlay.tsx`

