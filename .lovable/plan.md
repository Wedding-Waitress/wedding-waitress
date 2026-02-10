

# Fix: Background Lines Bleeding Through Image Gallery Modal

## Problem
The Place Cards page has elements with `z-index: 50` (guide lines in PlaceCardPreview). The Dialog overlay is also `z-50` with `bg-black/80` (semi-transparent). Because they share the same stacking level and the overlay isn't fully opaque, the page lines show through the modal.

## Root Cause
- Dialog overlay: `z-50`, `bg-black/80`
- PlaceCardPreview guide lines: `zIndex: 50`
- Same z-index + semi-transparent overlay = visible bleed-through

## Solution

### 1. Update `src/components/ui/dialog.tsx`
Add an optional `overlayClassName` prop to `DialogContent` so individual modals can customize the overlay without affecting all dialogs globally.

- Add `overlayClassName?: string` to `DialogContentProps`
- Pass it to the `DialogOverlay` component rendered inside `DialogContent`

### 2. Update `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`
Use the new `overlayClassName` prop to set the gallery modal's overlay to:
- `z-[55]` -- higher than the Place Cards page elements
- `bg-black/95` -- nearly fully opaque so nothing bleeds through

The DialogContent itself already has `zIndex: 60` which is above the overlay's `z-[55]`.

## Scope
- Small addition to `dialog.tsx` (one prop, one line change) -- backward compatible, no impact on other dialogs
- One prop addition in `PlaceCardGalleryModal.tsx`
- No changes to Place Cards page itself

