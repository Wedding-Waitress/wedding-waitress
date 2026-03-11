

## Plan: Fix Text Zone Resize Handles

**Problem**: Top/bottom handles exist and cause unexpected behavior (they fall through to corner resize logic and change width incorrectly). The user wants them removed entirely, and wants corner/side handles to only resize the text box container without distorting text.

**File: `src/components/ui/InteractiveTextOverlay.tsx`**

1. **Remove top middle handle** (lines 264-267) and **bottom middle handle** (lines 284-287) — delete these two `<Handle>` elements entirely.

2. That's the only change needed. The existing side handles (`resize-left`, `resize-right`) and corner handles (`resize-tl`, `resize-tr`, `resize-bl`, `resize-br`) already only modify `el.style.width` and `el.style.left` — they never apply `scaleX`/`scaleY` or change font size, so text reflows naturally without distortion.

**No changes needed** to `InvitationCardPreview.tsx` — the `handleResize` and `handleCornerResize` callbacks already only update `width_percent` and `x_percent`.

**Result**: 6 handles total (4 corners + 2 sides), all resize the box width only, text reflows naturally.

