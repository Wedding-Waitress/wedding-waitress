

# Add Total Design Count to Image Galleries

## What Changes

Add a purple "X total designs" counter to the right side of the header in both the Invitation Image Gallery and Place Cards Image Gallery modals.

## Visual Result

The `DialogTitle` row will show:
- Left: icon + gallery name (as now)
- Right: **"{count} total designs"** in purple text

## Files to Modify

### 1. `src/components/Dashboard/Invitations/InvitationGalleryModal.tsx`
- Update the `DialogTitle` to use `justify-between` layout
- Add `<span className="text-primary text-sm font-medium">{images.length} total designs</span>` on the right side

### 2. `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`
- Same change: add purple total designs count to the right of the header

## Technical Details
- Both components already have `images` array from their respective hooks (`useInvitationGallery` and `usePlaceCardGallery`)
- `images.length` gives the total count
- Uses `text-primary` class for the purple color (consistent with existing design system)
