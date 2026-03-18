

## Fix: Drag Position Persistence + Clamp Within Front Half

### Problem Analysis

The drag-and-release flow has two issues:

1. **Position reverts after release**: The `InteractiveTextOverlay` sets inline DOM styles during drag, then calls `onMove` which triggers an async save. If there's any timing gap between the DOM update and React's re-render (or if the save fails silently), the position snaps back. The root cause is that the inline `left`/`top` set on pointer-up get overwritten by React's re-render before the state has fully propagated.

2. **No bounds clamping**: Text can be dragged off the card entirely, causing it to disappear (as the user experienced — "half the name is missing, can't get it back").

### Fix Plan

**File 1: `src/components/ui/InteractiveTextOverlay.tsx`**

Add clamping during the drag to keep the element within the container bounds:

- In the `onPointerMove` handler for `mode === 'move'`, clamp `accumX` and `accumY` so the element's center stays within the container rectangle. Calculate bounds from `containerRect`, `initLeft`, `baseWidth`, and `baseHeight`.
- This provides real-time visual feedback that the text cannot leave the card.

Specifically:
```typescript
if (mode === 'move') {
  // Clamp so element center stays within container
  const elHalfW = baseWidth / 2;
  const elHalfH = baseHeight / 2;
  const minDx = -((initLeft / 100) * containerRect.width) + elHalfW;
  const maxDx = containerRect.width - ((initLeft / 100) * containerRect.width) - elHalfW;
  const minDy = -((initTop / 100) * containerRect.height) + elHalfH;
  const maxDy = containerRect.height - ((initTop / 100) * containerRect.height) - elHalfH;
  accumX = Math.max(minDx, Math.min(maxDx, dx));
  accumY = Math.max(minDy, Math.min(maxDy, dy));
  // ... rest of move logic
}
```

Also clamp the final `newLeft` and `newTop` in `onPointerUp` to 0–100% range.

**File 2: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**

Add clamping in `handleGuestNameMove` and `handleTableSeatMove` to ensure the mm offset never exceeds the card dimensions:

```typescript
const handleGuestNameMove = useCallback((dxPct: number, dyPct: number) => {
  const rawX = (currentSettings.guest_name_offset_x ?? 0) + (dxPct * CARD_WIDTH_MM) / 100;
  const rawY = (currentSettings.guest_name_offset_y ?? 0) + (dyPct * FRONT_HEIGHT_MM) / 100;
  // Clamp to card bounds (±half card width/height from center)
  const newX = Math.max(-CARD_WIDTH_MM / 2, Math.min(CARD_WIDTH_MM / 2, rawX));
  const newY = Math.max(-FRONT_HEIGHT_MM / 2, Math.min(FRONT_HEIGHT_MM / 2, rawY));
  onSettingsChange?.({
    guest_name_offset_x: Math.round(newX * 10) / 10,
    guest_name_offset_y: Math.round(newY * 10) / 10,
  });
}, [...]);
```

Same pattern for `handleTableSeatMove`.

**File 3: `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`**

Fix the state sync issue that causes snap-back. The problem is that `setLocalOverrides({})` can clear overrides before React has processed the new `settings` from the hook. Fix by NOT clearing overrides eagerly — instead, clear them in a `useEffect` that watches `settings`:

```typescript
// Instead of clearing in handlePreviewSettingsChange:
const handlePreviewSettingsChange = React.useCallback(async (changes: Partial<PlaceCardSettings>) => {
  setLocalOverrides(prev => ({ ...prev, ...changes }));
  await updateSettingsSilent(changes);
  // Don't clear here — let useEffect handle sync
}, [updateSettingsSilent]);

// Sync effect: when settings from DB update, clear matching overrides
React.useEffect(() => {
  if (!settings) return;
  setLocalOverrides(prev => {
    const next: typeof prev = {};
    for (const [key, value] of Object.entries(prev)) {
      if ((settings as any)[key] !== value) {
        (next as any)[key] = value;
      }
    }
    return Object.keys(next).length > 0 ? next : {};
  });
}, [settings]);
```

This ensures `localOverrides` are only cleared once `settings` actually contains the new values, eliminating the race condition that causes snap-back.

### Summary of Changes

| File | Change |
|------|--------|
| `InteractiveTextOverlay.tsx` | Clamp drag movement within container bounds during move and on release |
| `PlaceCardPreview.tsx` | Clamp mm offsets in move handlers to card dimensions |
| `PlaceCardsPage.tsx` | Fix state sync — use `useEffect` to clear overrides only when DB settings catch up |

### Result
- Text stays within the front half of the card (cannot drag off-canvas)
- Position persists on release — no snap-back
- All cards sync instantly since they share the same settings object

