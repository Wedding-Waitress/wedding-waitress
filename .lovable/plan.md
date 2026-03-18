

## Lock Interactive Text Overlay & Drag Logic

The user is happy with how the interactive text drag/move/resize/rotate works in both the Invitations editor and the Name Place Cards editor, and wants these protected from unintended changes.

### What to protect

Three files contain the working interactive text system:

1. **`src/components/ui/InteractiveTextOverlay.tsx`** — the shared overlay component (drag, resize, rotate, selection, toolbar)
2. **`src/components/Dashboard/Invitations/InvitationCardPreview.tsx`** — how Invitations uses the overlay (coordinate system, zone positioning, interactive mode logic)
3. **`src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`** — how Place Cards uses the overlay (absolute percentage positioning, mm-to-percent conversion, interactive mode logic)

### Changes

#### 1. Add protection headers to all three files
Add the same style of `⚠️ PRODUCTION-READY` comment block already used in `src/components/Dashboard/PlaceCards/index.ts`, specifying that the interactive text overlay system and its integration are locked and must not be modified without explicit user request.

#### 2. Update project knowledge
Store a memory entry documenting that these three files are locked, so future prompts automatically respect the rule even without the user repeating it.

No functional code changes — only protective comments added to file headers.

