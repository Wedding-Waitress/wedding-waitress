

## Check All Cards (Master + Slaves) for Text Overflow

### Problem
The overflow detection only checks the master card (`firstCardRef`). Slave cards with longer guest names (e.g., "Rebecca Wat..." being clipped) are not checked, so the border stays green even when slave cards overflow.

### Approach
Replace the single `firstCardRef` with a ref that collects all visible card front-half containers, then check every card's text elements against its own container.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` only

1. **Replace `firstCardRef` with `allCardRefs`**: Change from `useRef<HTMLDivElement>(null)` to `useRef<(HTMLDivElement | null)[]>([])`. Assign each card's front-half div into `allCardRefs.current[index]` instead of only the first card.

2. **Update overflow detection `useEffect`**: Loop over all entries in `allCardRefs.current`. For each non-null container, check all child text elements against that container's bounds. If any element in any card overflows → set `textOverflowing = true`.

3. **Update the red warning message**: Change from `'⚠️ Text is outside the card boundary. Please reduce font size or reposition the text.'` to `'⚠️ The text has gone over the border line in one or more cards. Please adjust the text size or position in the Master Card to fix all cards automatically.'`

4. **Keep green/red border and pulse animation only on the master card** (index 0) — no visual change to slave cards.

### What stays untouched
- InteractiveTextOverlay, positioning math, master-slave sync, persistence pipeline
- Green message text unchanged
- Border styling logic stays on master card only

