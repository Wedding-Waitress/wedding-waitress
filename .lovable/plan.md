

## Fix: Smooth Corner Resize with Synchronized Box + Font Size

**Problem**: Corner resize currently uses CSS `scale()` as a visual preview, then commits on release — causing a visual "jump" and desync between the box border and text size.

**Solution**: Replace the `scale()` approach with direct `width`/`height`/`fontSize` manipulation during the drag, so the box and text resize together in real-time.

### Changes in `src/components/ui/InteractiveTextOverlay.tsx`

**1. Capture `baseWidth` and `baseHeight` at drag start** (around line 84, after existing init vars):
```ts
const baseWidth = el.getBoundingClientRect().width;
const baseHeight = el.getBoundingClientRect().height;
```

**2. Replace the `fontsize-` block in `onPointerMove`** (lines 127–148):

Remove the current `scale()` / rAF logic. Replace with:
```ts
if (mode.startsWith('fontsize-')) {
  const corner = mode.replace('fontsize-', '');
  const isLeft = corner === 'tl' || corner === 'bl';
  const isTop = corner === 'tl' || corner === 'tr';
  const rawDx = isLeft ? -dx : dx;
  const rawDy = isTop ? -dy : dy;

  const newWidth = Math.max(50, baseWidth + (rawDx * 2));
  const newHeight = Math.max(50, baseHeight + (rawDy * 2));
  el.style.width = `${newWidth}px`;
  el.style.height = `${newHeight}px`;
  const newFontSize = Math.max(6, Math.min(200, (newWidth / baseWidth) * (currentFontSize || 24)));
  el.style.fontSize = `${newFontSize}px`;

  lastFontDelta = newFontSize - (currentFontSize || 24);
  setLiveFontSize(Math.round(newFontSize));
  return;
}
```

**3. Update the `fontsize-` block in `onPointerUp`** (lines 201–215):

On release, commit the font size delta via `onFontSizeChange`, then clear inline `width`/`height`/`fontSize` styles so React takes back control:
```ts
if (mode.startsWith('fontsize-')) {
  const roundedDelta = Math.round(lastFontDelta);
  if (onFontSizeChange && roundedDelta !== 0) {
    onFontSizeChange(roundedDelta);
  }
  // Clear inline overrides so React state takes over
  el.style.width = '';
  el.style.height = '';
  el.style.fontSize = '';
  el.style.transform = '';
  el.style.transformOrigin = '';
  return;
}
```

This gives smooth, real-time box+text resizing during drag with no jump on release.

