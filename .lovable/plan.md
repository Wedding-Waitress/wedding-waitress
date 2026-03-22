

## Fix Right-Edge Overflow Detection on Place Cards

### Root Cause
The front-half container has `overflow: hidden`, which causes the browser to clip overflowing text elements. When `getBoundingClientRect()` is called on clipped children, it returns the **clipped** rectangle, not the actual content extent. So text overflowing the right edge appears to "fit" because the browser reports it as fitting after clipping.

### Fix — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

**Overflow detection `useEffect` (lines 162-189)**: Instead of relying solely on `getBoundingClientRect()` (which is clipped), also check `scrollWidth` vs `clientWidth` on the container, and use `el.scrollWidth` on individual text elements. Specifically:

1. For each container in `allCardRefs`, compare `container.scrollWidth > container.clientWidth` or `container.scrollHeight > container.clientHeight` — this detects content that overflows even when `overflow: hidden` clips it visually.
2. Additionally, temporarily set `overflow: visible` on the container, measure text rects, then restore `overflow: hidden`. This allows accurate `getBoundingClientRect()` comparison for all four edges.

The cleaner approach is option 2: briefly flip overflow to `visible` during measurement inside the `requestAnimationFrame`, measure all text rects against the container rect, then flip back to `hidden`. This is invisible to the user (happens within a single frame before paint) and gives accurate measurements on all four sides.

```tsx
const rafId = requestAnimationFrame(() => {
  let overflowing = false;
  allCardRefs.current.forEach((container) => {
    if (!container || overflowing) return;
    // Temporarily allow overflow so getBoundingClientRect returns true extent
    const prevOverflow = container.style.overflow;
    container.style.overflow = 'visible';
    const containerRect = container.getBoundingClientRect();
    const textEls = Array.from(container.children);
    textEls.forEach((el) => {
      const elRect = el.getBoundingClientRect();
      if (
        elRect.left < containerRect.left - 1 ||
        elRect.right > containerRect.right + 1 ||
        elRect.top < containerRect.top - 1 ||
        elRect.bottom > containerRect.bottom + 1
      ) {
        overflowing = true;
      }
    });
    container.style.overflow = prevOverflow;
  });
  setTextOverflowing(overflowing);
});
```

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — overflow detection `useEffect` only (lines 162-189)

### What stays untouched
- InteractiveTextOverlay, positioning math, master-slave sync, persistence pipeline
- Border styling, messages, pulse animation — all unchanged

