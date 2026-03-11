

## Plan: Alignment Guides for Text Zone Dragging

### What It Does
When dragging a text zone, show dashed guide lines when the zone's center aligns with the canvas center (horizontal and/or vertical), with a snap threshold so the zone "locks" briefly to the center.

### Changes

**File: `src/components/ui/InteractiveTextOverlay.tsx`**

- Add a new optional callback prop: `onDragMove?: (pixelOffset: { x: number, y: number }) => void` — called on every pointermove during a `move` drag with the current accumulated pixel offset. This lets the parent render alignment guides in real-time.
- Add `onDragEnd?: () => void` — called on pointerup to clear guides.
- During the move drag loop, call `onDragMove` with `accumRef.current` on each frame.
- On pointerup, call `onDragEnd`.

**File: `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`**

- Add state: `dragGuides: { showVertical: boolean, showHorizontal: boolean } | null`
- Pass `onDragMove` to each `InteractiveTextOverlay`. In the callback:
  - Get the dragged zone's current position (`x_percent + pixel offset → effective center`)
  - Compare to canvas center (50%, 50%) with a threshold (~1.5%)
  - Set `dragGuides` state to show/hide each guide line
- Pass `onDragEnd` to clear `dragGuides` to `null`
- Render two guide lines inside the container (when active):
  - **Vertical center line**: full-height dashed line at `left: 50%`
  - **Horizontal center line**: full-width dashed line at `top: 50%`
  - Style: `1px dashed` in a contrasting color (e.g., `hsl(var(--primary))` with 70% opacity)

### Snap Behavior
When the zone center is within the threshold of 50%, the guide appears. Optionally, the accumulated offset can be nudged to snap exactly to center — providing a subtle magnetic effect.

### Files Changed
- `src/components/ui/InteractiveTextOverlay.tsx` — add `onDragMove` and `onDragEnd` callback props
- `src/components/Dashboard/Invitations/InvitationCardPreview.tsx` — compute guide visibility during drag, render guide lines

