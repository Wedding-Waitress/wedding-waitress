

## The Root Cause

I found the bug. The `useLayoutEffect` in `InteractiveTextOverlay.tsx` (lines 70-78) **actively destroys** React's correct styles after every drag/resize/rotate:

```
useLayoutEffect(() => {
  if (pendingClearRef.current && elRef.current) {
    elRef.current.style.transform = '';  // ← REMOVES the correct transform React just applied
    elRef.current.style.width = '';      // ← REMOVES the correct width React just applied
    elRef.current.style.left = '';       // ← REMOVES the correct left React just applied
    pendingClearRef.current = false;
  }
});
```

**What happens step by step:**
1. User drags text → DOM transform is set manually with `translate(px, px)` offset
2. User releases → `onMove` is called, which updates `x_percent`/`y_percent` in parent state
3. React re-renders with new props → React correctly sets the new `left`, `top`, `transform` styles on the element
4. **`useLayoutEffect` fires and clears `transform`, `width`, `left` to empty strings** → element jumps to wrong position (no transform = no `translateY(-50%)`, no rotation)
5. Then... nothing fixes it, so it stays broken or the next render partially recovers — causing the "bounce"

The same bug affects resize (clears `width` and `left`).

## Plan

**File: `src/components/ui/InteractiveTextOverlay.tsx`** — Rewrite the interaction logic:

1. **Remove the broken `useLayoutEffect`** — it's actively causing the bounce. React's re-render already applies the correct styles; we must not undo them.

2. **Remove `pendingClearRef`** — no longer needed.

3. **Fix the drag onPointerUp**: After calling `onMove()`, simply reset the internal accumulators. React's next render with new props will set the correct styles naturally.

4. **Fix the resize onPointerUp**: Same approach — call `onResize`/`onCornerResize`, and let React handle the DOM. The manual inline overrides from the drag loop will be overwritten by React's re-render since the style prop values change.

5. **Fix resize initial value capture** (line 96-97): `el.offsetLeft` returns **pixels** but the code treats it as a **percentage**. Use `parseFloat(el.style.left)` only (it's always set as a percentage from the style prop). Same for width.

6. **Keep the direct DOM manipulation during drag/resize/rotate** — this is correct for smooth 60fps feedback. The key insight is: we only need to let React overwrite our manual styles on the next render after pointerUp, which it does automatically.

**File: `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`** — No changes needed. The resize math here is correct.

