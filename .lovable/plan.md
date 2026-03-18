

## Fix: Drag Jumping & Reset to Default Not Working in Name Place Cards

### Root Cause Analysis

After deep investigation, there are **two distinct bugs**:

**Bug 1: Save still fails with NOT NULL constraint**
The `safeDefaults` in `saveSettings` are built from `baseSettings` values using `baseSettings.guest_name_offset_x ?? 0`. However, the `baseSettings` object comes from `ensureSettingsExist()`, which returns `settings` — the React state captured in the closure. If `settings` is stale or `null` at the time of the call (e.g., user interacts before the initial fetch completes), `ensureSettingsExist` tries to create a new row. If that also fails or returns a row with NULL-able fields that are `null`, the downstream safeDefaults still propagate nulls. The fix: use hardcoded INSERT_DEFAULTS as the fallback source instead of baseSettings values.

**Bug 2: Reset to Default doesn't clear `localOverrides`**
The customizer's Reset button calls `onSettingsChange` (which is `updateSettings` from the hook). But the PlaceCardsPage maintains a separate `localOverrides` state for drag operations. When Reset fires through the customizer, `localOverrides` are never cleared — so even if the save succeeds, the merged settings still contain the old dragged position from `localOverrides`.

### Fix Plan

**File 1: `src/hooks/usePlaceCardSettings.ts`**
- In `saveSettings`, change `safeDefaults` to use hardcoded fallbacks from `INSERT_DEFAULTS` instead of `baseSettings` values. This guarantees that even if the fetched row has unexpected NULLs, the update payload always satisfies NOT NULL constraints:
  ```typescript
  const safeDefaults = {
    guest_name_offset_x: baseSettings.guest_name_offset_x ?? INSERT_DEFAULTS.guest_name_offset_x,
    guest_name_offset_y: baseSettings.guest_name_offset_y ?? INSERT_DEFAULTS.guest_name_offset_y,
    // ... all other NOT NULL fields using INSERT_DEFAULTS as fallback
  };
  ```
- Add a defensive `console.log` of the final update payload (temporary, for debugging if the issue persists)

**File 2: `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`**
- Expose a `clearLocalOverrides` function and pass it to the customizer OR: make the customizer's `onSettingsChange` also clear localOverrides. The simplest approach: change the customizer's `onSettingsChange` prop from `updateSettings` to a wrapper that also clears `localOverrides`:
  ```typescript
  const handleCustomizerSettingsChange = async (changes) => {
    setLocalOverrides({}); // Clear any drag overrides
    return updateSettings(changes);
  };
  ```
- Pass `handleCustomizerSettingsChange` instead of `updateSettings` to `PlaceCardCustomizer`

**File 3: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**
- No changes needed — the drag handlers and InteractiveTextOverlay are correct. The position jump is caused by the failed save (Bug 1) combined with localOverrides not being cleared properly.

### Summary
- 2 files changed: `usePlaceCardSettings.ts` (robust safeDefaults), `PlaceCardsPage.tsx` (clear localOverrides on customizer changes)
- Reset to Default will work because: save succeeds (Bug 1 fixed) AND localOverrides are cleared (Bug 2 fixed)
- Drag will work because: save succeeds, position persists in DB, and localOverrides sync correctly

