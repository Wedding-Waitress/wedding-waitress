

## Analysis: Current Implementation Already Correct

After thorough investigation of all three files, the drag handlers are **already wired correctly**:

1. **PlaceCardsPage.tsx line 482**: `PlaceCardPreview` receives `onSettingsChange={handlePreviewSettingsChange}` — NOT `updateSettings`
2. **PlaceCardPreview.tsx lines 100-108**: `handleGuestNameMove` converts pixel % deltas to mm offsets and calls `onSettingsChange` (which IS `handlePreviewSettingsChange`)
3. **PlaceCardPreview.tsx lines 129-138**: `handleTableSeatMove` follows the same pattern
4. **PlaceCardsPage.tsx lines 61-66**: `handlePreviewSettingsChange` sets `localOverrides` for instant visual feedback, then calls `updateSettingsSilent` for background DB save
5. **PlaceCardsPage.tsx lines 69-81**: `useEffect` clears overrides only when DB settings catch up

The `PlaceCardCustomizer` (line 466) correctly uses `updateSettings` directly — it handles non-drag settings like fonts and colors.

**No code changes are needed.** The pattern already matches the described behavior:
- Drag → pixel delta → mm conversion → `handlePreviewSettingsChange` → local override + silent save → position persists

If snap-back is still occurring, the issue would be elsewhere (e.g., in `InteractiveTextOverlay`'s inline style cleanup on pointer up, or a stale closure in the `useCallback` dependencies). But the routing of drag operations through `handlePreviewSettingsChange` is already correctly implemented.

