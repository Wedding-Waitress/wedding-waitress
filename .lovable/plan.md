
Goal: make Name Place Cards text positioning truly global and stable after pointer release so master and all other cards remain identical.

What I found
- Real-time drag mirroring is working via `draftOverrides` in `PlaceCardPreview`.
- The desync happens at release because `draftOverrides` is cleared immediately, while persistence is async.
- The master card can keep imperative inline styles from `InteractiveTextOverlay` (`left/top/transform`) longer than passive cards, so it visually diverges.
- `usePlaceCardSettings.updateSettings` optimistic update is currently `prev ? ... : null`, so when settings are null (first-save path), there is no immediate shared state update.

Implementation plan

1) Add a committed shared preview state (post-release, pre-server-ack)
- File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`
- Add `committedOverrides` for guest/table (offsets, rotation, font size).
- Render all cards from one `effectiveSettings = currentSettings + committedOverrides`.
- Keep `draftOverrides` only for live pointer movement; on pointer-up:
  - compute next shared values from `effectiveSettings`
  - write to `committedOverrides` immediately
  - clear `draftOverrides`
  - persist with `onSettingsChange(...)` (await result)

2) Stop stale inline DOM from owning master-card position after release
- File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` (and optionally `InteractiveTextOverlay.tsx` with a safe optional prop)
- After move/rotate/resize commit, clear first-card inline style remnants (`left/top/transform/width/height/fontSize`) so React shared state is always the source of truth.
- Apply this cleanup on both element types (Guest Name, Table/Seat), not only reset.

3) Harden save pipeline for first-save and race conditions
- File: `src/hooks/usePlaceCardSettings.ts`
- Fix optimistic update to work when previous settings are null (seed a local settings object instead of returning null).
- Add request-sequencing guard so older async responses cannot overwrite newer placement changes.
- Keep persisted state authoritative when newest response returns; ignore stale responses.

4) Align reset behavior with same shared state model
- File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`
- Ensure both reset entry points clear:
  - `draftOverrides`
  - `committedOverrides`
  - saved global fields (offsets/rotation/font size)
- Keep identical logic for toolbar reset and bottom reset.

Validation (must pass)
- Drag Guest Name on master card → all visible cards mirror during drag and stay identical after release.
- Drag Table/Seat similarly → no snap-back on passive cards; no master-only offset.
- Repeat multiple quick drags/rotations/resizes → latest action wins, no stale overwrite.
- Test first-save scenario (no existing settings row) and existing-row scenario.
- Confirm reset (top icon + bottom button) returns all cards to identical defaults.
