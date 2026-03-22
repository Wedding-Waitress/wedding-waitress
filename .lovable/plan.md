

## Fix Horizontal Drag on Place Cards

### Root cause
`buildAbsoluteStyle` was changed to always use `left: 0; width: 100%; textAlign: center` for visual centering. This means `pos.x` (which includes saved horizontal offsets) is completely ignored. During a drag, the InteractiveTextOverlay applies a `translate(dx px, dy px)` which works visually. But when the overlay remounts after drag end, the saved X offset is lost because `buildAbsoluteStyle` doesn't use it. The text snaps back to center, making horizontal drag appear "frozen."

### Fix
**File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`** — `buildAbsoluteStyle` function only

When `pos.x` differs from 50 (the default center), apply the horizontal shift using `paddingLeft` or `paddingRight` on the full-width container. This preserves the `width: 100%; textAlign: center` approach while allowing horizontal repositioning.

```tsx
const buildAbsoluteStyle = (
  baseStyle: React.CSSProperties,
  pos: { x: number; y: number; rotation: number; fontSize: number },
  unit: string = 'pt'
): React.CSSProperties => {
  const xShift = pos.x - 50;
  return {
    ...baseStyle,
    position: 'absolute' as const,
    left: 0,
    width: '100%',
    top: `${pos.y}%`,
    transform: `translateY(-50%) rotate(${pos.rotation}deg)`,
    transformOrigin: 'center center',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    fontSize: `${pos.fontSize}${unit}`,
    ...(Math.abs(xShift) > 0.01 ? {
      paddingLeft: xShift > 0 ? `${xShift * 2}%` : undefined,
      paddingRight: xShift < 0 ? `${Math.abs(xShift) * 2}%` : undefined,
    } : {}),
  };
};
```

The asymmetric padding shifts the center point of the text. `xShift * 2` is used because adding padding to one side shifts the visual center by half that amount (the text is centered within the remaining space).

### What stays untouched
- InteractiveTextOverlay (locked)
- handleInteractiveMove (already handles both X and Y correctly)
- Master-slave mirroring, committedOverrides, overlayKey re-keying
- Persistence pipeline

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — `buildAbsoluteStyle` only

