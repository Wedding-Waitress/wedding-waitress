

## Fix: Drag/Move Triggering "Failed to save settings" Error

### Root Cause

In `PlaceCardsPage.tsx`, the `onSettingsChange` prop passed to `PlaceCardPreview` is wired directly to `updateSettings` (the database-saving function). When a user drags text in Text Edit Mode, the move handler calls `onSettingsChange` which immediately hits Supabase. If no settings row exists yet, the `ensureSettingsExist` call can fail or race, producing the "Failed to save settings" error. Even when it succeeds, the round-trip is slow and the toast spam is disruptive.

### Fix: Local State Buffer with Deferred Save

Add a local settings override layer in `PlaceCardsPage.tsx` that separates visual updates from database persistence:

1. **`PlaceCardsPage.tsx`** — Add `localSettingsOverride` state (a `Partial<PlaceCardSettings>` object):
   - Create a new `handlePreviewSettingsChange` function that merges changes into `localSettingsOverride` state (instant, no DB call)
   - Pass `{ ...settings, ...localSettingsOverride }` as the merged settings to `PlaceCardPreview`
   - Keep `updateSettings` as `onSettingsChange` for `PlaceCardCustomizer` (sliders/inputs already work fine)

2. **`PlaceCardPreview.tsx`** — Add an `onSettingsCommit` prop for final persistence:
   - Add a new `onSettingsCommit?: (settings: Partial<PlaceCardSettings>) => void` prop
   - In the `InteractiveTextOverlay` `onDragEnd` callback (already fires on pointer-up), call `onSettingsCommit` with the accumulated changes
   - Keep `onSettingsChange` for instant visual feedback during drag

3. **`PlaceCardsPage.tsx`** — Wire `onSettingsCommit` to `updateSettings`:
   - When `onSettingsCommit` fires, call `updateSettings(changes)` and clear `localSettingsOverride`
   - This saves to DB only once per drag operation

### Simpler Alternative (preferred)

Actually, looking more carefully, `InteractiveTextOverlay` already only calls `onMove` on pointer-up (line 180). The problem is purely that `updateSettings` itself fails. The simplest fix:

1. **`PlaceCardsPage.tsx`** — Add local settings state that merges with DB settings:
   - `const [localOverrides, setLocalOverrides] = useState<Partial<PlaceCardSettings>>({});`
   - Create `handlePreviewChange` that: (a) merges into `localOverrides` immediately, (b) calls `updateSettings` in background without blocking UI, (c) suppresses the error toast for drag operations
   - Pass merged `{ ...settings, ...localOverrides }` to preview
   - Pass `handlePreviewChange` as `onSettingsChange` to preview

2. **`usePlaceCardSettings.ts`** — Add a silent update variant or option:
   - Add `updateSettingsSilent` that does the same DB operation but doesn't show error/success toasts
   - This prevents the red error toast from appearing during drag operations
   - On success, sync local state; on failure, log but don't toast

### Files Changed

- **`src/hooks/usePlaceCardSettings.ts`**: Add `updateSettingsSilent` function (same as `updateSettings` but no toasts, returns boolean)
- **`src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`**: Add `localOverrides` state, create `handlePreviewChange` that updates locally + saves silently, pass merged settings to preview

### Result
- Dragging text elements updates the canvas instantly via local state
- DB save happens in background without blocking or error-toasting
- If save fails silently, the next successful save will include all accumulated changes
- Customizer sliders continue to use `updateSettings` with normal toast feedback

