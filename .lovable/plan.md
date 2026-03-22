

## Fix Text Centering on Place Cards

### Root cause
The `isDefaultX` check (`Math.abs(pos.x - 50) < 0.01`) only triggers full-width centering when there are **zero saved offsets**. If the user previously dragged the text even slightly, the database stores a non-zero `guest_name_offset_x` or `table_offset_x`, making `guestPos.x` differ from 50. This causes the code to fall back to point-based positioning (`left: X%` + `translate(-50%, -50%)`), which can appear off-center with script fonts.

### Fix
Widen the centering approach so it's not dependent on the x-offset being exactly at 50%. Instead:

1. **In `buildAbsoluteStyle`** — Remove the `isDefaultX` conditional entirely. Always use the full-width centering approach: `left: 0`, `width: 100%`, `textAlign: center`. For non-default x positions, apply a `paddingLeft`/`paddingRight` differential or use `text-indent` to shift the center point.

   Simpler alternative: keep the dual approach but make the threshold much larger (e.g., `< 5` instead of `< 0.01`), so small drags still get full-width centering.

   **Simplest approach (recommended)**: Always use full-width centering regardless of x-offset. Use `paddingLeft` to shift the text when x != 50:
   ```tsx
   // Always full-width centered
   const xShiftPercent = pos.x - 50; // 0 when centered
   return {
     ...baseStyle,
     position: 'absolute',
     left: 0,
     width: '100%',
     top: `${pos.y}%`,
     transform: `translateY(-50%) rotate(${pos.rotation}deg)`,
     transformOrigin: 'center center',
     textAlign: 'center',
     whiteSpace: 'nowrap',
     fontSize: `${pos.fontSize}${unit}`,
     paddingLeft: xShiftPercent > 0 ? `${xShiftPercent * 2}%` : undefined,
     paddingRight: xShiftPercent < 0 ? `${Math.abs(xShiftPercent) * 2}%` : undefined,
   };
   ```

2. **Adjust InteractiveTextOverlay drag commit** — When drag ends (line 201), instead of setting `el.style.left`, update `el.style.paddingLeft`/`paddingRight` to match the new offset. This keeps `width: 100%` intact during and after drag.

   However, this would modify locked InteractiveTextOverlay code. **Alternative**: Keep InteractiveTextOverlay untouched. Since the re-keying strategy remounts the overlay after each drag, the inline style overrides get cleared and React state takes over. The issue is only with the **initial render** when saved offsets exist.

### Recommended minimal change

**File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**

Update `buildAbsoluteStyle` to always use full-width centering with a margin-based horizontal shift:

```tsx
const buildAbsoluteStyle = (
  baseStyle: React.CSSProperties,
  pos: { x: number; y: number; rotation: number; fontSize: number },
  unit: string = 'pt'
): React.CSSProperties => {
  const xShift = pos.x - 50; // percentage offset from center
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
    // Shift text horizontally via asymmetric padding when not at center
    ...(Math.abs(xShift) > 0.01 ? {
      paddingLeft: xShift > 0 ? `${xShift * 2}%` : '0',
      paddingRight: xShift < 0 ? `${Math.abs(xShift) * 2}%` : '0',
    } : {}),
  };
};
```

### What won't change (locked)
- InteractiveTextOverlay internals
- Master-slave mirroring architecture
- Persistence pipeline

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — `buildAbsoluteStyle` function only

