

## Fix Place Card Text Controls — Full Reset + Prevent Clipping

### Issue 1: Reset Button Not Fully Resetting

**Current state**: The per-element toolbar reset (`handleInteractiveReset`) resets `offset_x/y` and `rotation` but does NOT reset font size. The bottom "Reset to Default" button also doesn't reset font sizes.

**Fix**: Update `handleInteractiveReset` in `PlaceCardPreview.tsx` to also reset font size back to defaults:
- Guest Name: `guest_name_font_size: 40` (the default)
- Table/Seat: `info_font_size: 16` (the default)

Also update the bottom "Reset to Default" button in `PlaceCardCustomizer.tsx` to include `guest_name_font_size: 40` and `info_font_size: 16`.

**Files**: `PlaceCardPreview.tsx` (lines 158-166), `PlaceCardCustomizer.tsx` (lines 437-447)

### Issue 2: Controls Getting Cut Off / Hidden

**Root cause**: The front-half container has `overflow: hidden` (line 325) which clips the toolbar and handles when text is near the edges.

**Fix** — three changes in `PlaceCardPreview.tsx`:

1. **Remove `overflow: hidden`** from the interactive front-half container (line 325). Change to `overflow: visible` when `isInteractive`.

2. **Increase z-index** on the interactive card container so selected overlays render above adjacent cards and guide lines:
   - The card div (line 219) gets `zIndex: 200` when `isInteractive`
   - The front-half div gets `zIndex: 200` when `isInteractive`

3. **InteractiveTextOverlay already uses `zIndex: 20` for selected** — this is sufficient relative to siblings. The toolbar uses `zIndex: 30`. These work correctly once the parent stops clipping.

No changes to `InteractiveTextOverlay.tsx` (locked file) are needed.

### Files Modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — full reset + overflow fix
- `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx` — bottom reset includes font sizes

