
Investigated the current Name Place Cards Text Edit Mode code and found the main bug.

What is actually going wrong
- In `PlaceCardPreview.tsx`, `clearMasterInlineStyles()` clears `left`, `top`, and `transform` from the interactive overlays inside the top-left master card.
- Those overlays are absolutely positioned, so clearing those properties sends them back to the element default: top-left.
- It also clears both text overlays at once, which explains why moving one text line can make both Guest Name and Table/Seat jump.
- The live sync logic is partly correct during drag (`draftOverrides`), but the master card still relies on imperative DOM styles at release, so the cleanup step is breaking the final position.
- `usePlaceCardSettings.ts` still has no request-order protection, so repeated drags can also allow older saves to overwrite newer ones.

Fix approach
1. Fix the master-card release bug in `PlaceCardPreview.tsx`
- Remove the destructive cleanup of `left/top/transform` after move/rotate/release.
- Replace it with a safer reset strategy:
  - only clear temporary resize-only inline styles if needed
  - remount or re-key the interactive overlay after commit so React re-applies the shared position model cleanly
- Make sure the master card, like all slave cards, always renders from shared effective values instead of stale DOM state.

2. Keep one true shared model for all cards
- Continue using `draftOverrides` for live drag/rotate/resize preview.
- Keep `committedOverrides` active after release until persisted settings catch up.
- Build both master and passive cards from the same effective values:
  - Guest Name offsets/rotation/font size
  - Table/Seat offsets/rotation/font size

3. Harden persistence in `usePlaceCardSettings.ts`
- Add request sequencing so older async save responses cannot overwrite newer drag results.
- Keep the optimistic update path, including first-save seeding, but only accept the latest response.

4. Make cleanup targeted, not global
- Do not query and wipe every `[data-text-content]` parent in the first card.
- If cleanup is still needed, scope it to transient properties on the element being edited only.

Files to update
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`
- `src/hooks/usePlaceCardSettings.ts`
- Possibly `src/components/ui/InteractiveTextOverlay.tsx` if a small remount/reset hook is needed

Expected result
- While dragging: all cards mirror in real time.
- On release: the moved text stays exactly where dropped.
- The master card no longer jumps to the top-left.
- Guest Name and Table/Seat remain perfectly aligned across every card, with no per-card drift and no stale save overwrites.

Technical notes
- Root cause is not the shared-position architecture itself; it is the post-release DOM cleanup wiping canonical absolute-position styles.
- The safest fix is to let React state own final placement, and use remount/reset only to discard temporary imperative drag styles.