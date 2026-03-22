

## Move Status Message Below Customizer Box

### Problem
The green/red status banner ("Text is perfectly positioned...") currently sits at the bottom of the A4 preview area (inside `PlaceCardPreview`). It should be below the "Reset to Default" button, outside the customizer box, on the left panel.

### Approach
1. **Expose `textOverflowing` from `PlaceCardPreview`** via a callback prop so the parent page knows the overflow state.
2. **Remove the banner JSX** from `PlaceCardPreview.tsx` (lines 757-768).
3. **Render the banner in `PlaceCardsPage.tsx`** directly below the `<PlaceCardCustomizer>` component, inside the left panel column (`lg:col-span-2`), with `mt-4` spacing and matching width.

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — add `onOverflowChange?: (v: boolean) => void` prop, call it when `textOverflowing` changes, remove banner JSX.
- `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` — add `textOverflowing` state, pass callback to preview, render banner below customizer when `textEditMode` is active.

