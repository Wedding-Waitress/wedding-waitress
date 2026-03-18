

## Fix: Remove `setLocalOverrides({})` from PlaceCardCustomizer's onSettingsChange

**Problem**: Line 467 clears all local drag overrides whenever the customizer saves any setting. This wipes out in-progress or recently-saved drag positions before the DB response updates `settings`, causing snap-back.

**Change in `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`**:

At line 466-469, change:
```typescript
onSettingsChange={async (changes) => {
  setLocalOverrides({});
  return updateSettings(changes);
}}
```
to:
```typescript
onSettingsChange={updateSettings}
```

The `useEffect` at line 69 already handles clearing `localOverrides` when `settings` syncs from the DB. Only `handlePreviewSettingsChange` should manage local overrides for drag operations.

**Files changed**: 1 (`PlaceCardsPage.tsx`, ~3 lines)

