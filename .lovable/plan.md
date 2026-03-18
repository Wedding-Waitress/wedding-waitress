
Root cause

- `PlaceCardPreview` is currently using two different positioning systems for the same text:
  - the editable card uses absolute `left/top` anchors with `translate(-50%, -50%)`
  - the other cards use normal flow layout plus `transform: translate(...)`
- Because those systems are different, the same saved offsets do not produce the same visual result.
- Live sync is also incomplete: the first card has temporary drag/resize/rotate state in the overlay, but the other cards only see persisted settings later.

Implementation

1. Unify Guest Name and Table/Seat rendering in `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`
   - Create one shared layout helper for each text type that returns the full absolute-position style from a single global source of truth.
   - That helper should define:
     - base anchor position
     - X/Y offsets
     - centering translate
     - rotation
     - font size
     - shared alignment/whitespace rules
   - Use that same helper for:
     - the editable master card
     - all other visible cards
     - the print/export pages rendered by the same preview component

2. Remove per-card layout differences for the standard place-card text path
   - Stop rendering passive cards from the old flex/flow-based placement for Guest Name and Table/Seat.
   - Keep only one shared positioning model so every card is drawn from the same data.

3. Add shared live preview state in `PlaceCardPreview.tsx`
   - Store transient draft edits separately for:
     - `guest-name`
     - `table-seat`
   - Render every card from `effectiveLayout = saved settings + live draft`
   - The first visible card stays only as the control surface; it must not own unique positioning anymore.

4. Extend `src/components/ui/InteractiveTextOverlay.tsx` with optional live-update callbacks
   - Emit live values during:
     - move/drag
     - rotation
     - corner resize/font-size scaling
   - Clear those live draft values on pointer-up/reset.
   - Keep the new props optional so Invitations and other existing uses continue working unchanged.

5. Keep persistence global
   - On pointer-up, commit the shared layout once through `onSettingsChange`.
   - Do not store any per-card override or DOM-only placement state.
   - Keep the existing optimistic settings update so the mirrored cards stay in sync with the saved model.

6. Small related cleanup
   - Make the master editable card the first rendered card on the active preview page, not hardcoded to page 1 only.
   - This matches the “first visible card is the live preview” behavior the editor implies.

Files to update

- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`
- `src/components/ui/InteractiveTextOverlay.tsx`

Expected result

- Moving Guest Name or Table/Seat on the master card instantly mirrors across all visible cards.
- Rotation and corner-resize/font-size edits mirror the same way.
- After release/save, every card and every preview/export page stays visually identical because they all render from one shared global layout model.
- No card can keep a unique or stale position anymore.
