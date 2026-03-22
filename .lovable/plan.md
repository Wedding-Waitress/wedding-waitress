

## Center Guest Name Text on Place Cards

### What's happening
Both guest name and table/seat text use the same absolute positioning: `left: 50%` with `transform: translate(-50%, -50%)`. This technically centers the element's bounding box, but with `whiteSpace: 'nowrap'`, each element shrinks to its content width. The `textAlign: 'center'` has no visual effect on a content-width box — the box itself is centered, but curly/script fonts create a visual perception of left-shift because their character shapes carry more visual weight on the left.

### Fix
Make both text containers span the full card width so `textAlign: center` works across the entire card, not just the content bounding box. This means:

1. In `buildAbsoluteStyle`, change `left: 50%` + `translate(-50%, -50%)` to `left: 0` + `width: 100%` + `translate(0, -50%)` — this makes the element span the full card width, and `textAlign: center` does the horizontal centering.

2. Keep `top` percentage-based for vertical positioning. Keep rotation working via the transform.

3. This applies to **both** guest name and table/seat elements, so they stay perfectly aligned.

### Constraint
The interactive drag system in InteractiveTextOverlay manipulates `left` and `top` imperatively during drag. Changing to full-width + textAlign centering means horizontal drag would need to adjust a horizontal offset (e.g. `paddingLeft`/`paddingRight` or `text-indent`) instead of `left`. However, since the user only needs vertical + horizontal centering at default, and the drag system already commits percentage deltas via `onMove`, the simplest approach is:

- At **default** (offset 0,0): use `left: 0; width: 100%; textAlign: center; transform: translate(0, -50%)`
- When **offset is non-zero** (user dragged): revert to the current `left: X%; translate(-50%, -50%)` approach

This preserves drag functionality while fixing the default centering.

### Files to update
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — modify `buildAbsoluteStyle` to use full-width centering when x-offset is at 50% (default)

### What won't change (locked)
- InteractiveTextOverlay drag/move/rotate/resize logic
- Master-slave mirroring, committedOverrides, draftOverrides
- Persistence pipeline in usePlaceCardSettings.ts

