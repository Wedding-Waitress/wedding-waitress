
Fix global place-card text sync by making every card render from one shared layout model instead of mixing two positioning systems.

1. Root cause
- In `PlaceCardPreview.tsx`, the master card uses absolute positioning (`left/top + translate(-50%, -50%)`) but the other cards still use normal flex/flow layout plus `transform: translate(mm)`.
- That means the same saved offsets do not produce the same visual position across cards.
- During editing, only the selected overlay has temporary live drag/resize/rotate state, so the other cards cannot mirror it instantly.
- The “master card” is also hardcoded to page 1 (`currentPage === 1 && index === 0`) instead of the first visible card on the active page.

2. Implementation
- In `PlaceCardPreview.tsx`, create shared style helpers for:
  - Guest Name
  - Table / Seat
- Each helper should build the full rendered position from a single global model:
  - base anchor
  - x/y offsets
  - rotation
  - font size
  - centering transform
  - alignment / white-space
- Use those same helpers for:
  - the interactive master card
  - all passive preview cards
  - all print/export pages

3. Remove per-card layout differences
- For the standard place-card layout, stop rendering passive cards with flex-column flow positioning.
- Render Guest Name and Table / Seat as absolutely positioned elements in every card so all cards inherit the exact same anchor + offset math.
- Keep the decorative split-image branch unchanged unless needed.

4. Add true live mirroring
- Add lightweight draft state in `PlaceCardPreview.tsx` for:
  - `guest-name`
  - `table-seat`
- While the user drags / rotates / resizes the master card, update this draft state and render every visible card from:
  - `effective values = saved settings + live draft`
- On interaction end, persist the final shared values once through `onSettingsChange`.

5. Extend the overlay safely
- In `InteractiveTextOverlay.tsx`, add optional live-update callbacks for:
  - drag move
  - rotation preview
  - corner resize / font-size preview
- Keep them optional so Invitations and other existing uses continue working unchanged.

6. Make the visible top-left card the real master
- Change the master-card check from `currentPage === 1 && index === 0` to the first card on the active preview page.
- This matches the UI expectation that the top-left visible card is the control surface.

7. Keep reset behavior aligned with the shared model
- Both reset actions should clear the shared saved values and any active draft values so no card can keep a stale position after editing.
- This preserves the earlier reset fix while making all cards redraw from the same source of truth.

Files to update
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`
- `src/components/ui/InteractiveTextOverlay.tsx`
- Possibly `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` only if a small shared reset/master-control prop is needed

Expected result
- Moving or resizing Guest Name or Table / Seat on the master card instantly mirrors across all other visible cards.
- After release/save, every card on every page remains visually identical.
- No card keeps a unique local position anymore.
- The preview behaves like one global layout editor, not one edited card plus stale copies.
