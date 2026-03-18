

## Remove Side Resize Handles for Place Card Text Elements

### What
Add a `hideSideHandles` prop to `InteractiveTextOverlay` and use it in `PlaceCardPreview` for both Guest Name and Table/Seat overlays.

### Changes

**1. `src/components/ui/InteractiveTextOverlay.tsx`**
- Add optional prop `hideSideHandles?: boolean` (default `false`)
- Conditionally skip rendering the two middle-side `<Handle>` elements (lines 330-336: `resize-left` and `resize-right`) when `hideSideHandles` is true
- No other changes to the locked file

**2. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**
- Pass `hideSideHandles={true}` to both `<InteractiveTextOverlay>` instances (Guest Name and Table/Seat)

### Result
- 4 corner handles remain (font-size scaling)
- Drag/move, rotation, toolbar all unchanged
- Side stretch handles hidden — prevents users from widening text boxes to alter data-driven content
- Invitations editor unaffected (prop defaults to `false`)

