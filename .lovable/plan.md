

## Fix: Stale DOM Position After Reset

### Root Cause

`InteractiveTextOverlay` sets `el.style.left` and `el.style.top` directly on the DOM during drag. After drag ends, `updateSettings` makes an async Supabase call and only updates React state **after the response**. So:

1. Before drag: React prop `left: '50%'`
2. Drag ends: DOM directly set to `left: '55%'`, async Supabase call starts
3. Reset fires: sets offset back to 0, another async call starts
4. Re-render: React prop goes from `'50%'` → `'50%'` (the drag value never reached React state) — **no DOM update**
5. The drag's Supabase call may also resolve and overwrite the reset

### Fix — Two changes

**1. `src/hooks/usePlaceCardSettings.ts` — Optimistic local state update**

In `updateSettings`, immediately merge `newSettings` into local state BEFORE the Supabase call. This ensures React re-renders with correct values instantly, making the style prop change visible to the DOM reconciler.

```ts
// Before the Supabase call:
setSettings(prev => prev ? { ...prev, ...newSettings } : null);
```

Then if the Supabase call succeeds, `setSettings` updates with the authoritative response. If it fails, we could roll back, but the current pattern already shows an error toast — keeping it simple.

**2. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — Force DOM sync on reset**

In `handleInteractiveReset`, after calling `onSettingsChange`, also directly clear the interactive element's inline styles via `firstCardRef` to guarantee the DOM matches:

```ts
// After onSettingsChange, force clear any stale inline styles on the first card's interactive elements
const el = firstCardRef.current;
if (el) {
  el.querySelectorAll('[data-text-content]').forEach(node => {
    const parent = node.parentElement;
    if (parent) {
      parent.style.left = '';
      parent.style.top = '';
      parent.style.transform = '';
      parent.style.width = '';
      parent.style.height = '';
      parent.style.fontSize = '';
    }
  });
}
```

This belt-and-suspenders approach ensures:
- Optimistic state = React props update immediately = DOM reconciler detects the change
- Direct DOM clear = even if React skips, stale values are gone

### Files Modified
- `src/hooks/usePlaceCardSettings.ts` — add optimistic state update before async call
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — DOM cleanup in reset handler

