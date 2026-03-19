

## Lock the Place Cards Text Positioning & Sync Feature

The three core files already have production-lock headers from an earlier lock. The plan is to update those headers with the current date and explicitly mention the text positioning global sync feature as locked.

### Files to update (header comment only — no logic changes)

1. **`src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`** — Update lock header date to 2026-03-19; add note that the global text sync / committed-overrides / re-keying architecture is locked.

2. **`src/hooks/usePlaceCardSettings.ts`** — Update lock header date to 2026-03-19; add note that the request-sequencing and optimistic update pipeline is locked.

3. **`src/components/ui/InteractiveTextOverlay.tsx`** — Update lock header date to 2026-03-19; confirm the interactive drag/move/resize/rotate system remains locked.

4. **`src/components/Dashboard/PlaceCards/index.ts`** — Update lock header date to 2026-03-19.

No functional code will be changed — only the comment headers to reflect the latest lock date and feature scope.

