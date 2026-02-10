

# Remove Two White Lines from Image Gallery

## Problem
Two visible horizontal white lines appear across the Image Gallery modal. These are rendering artifacts from the Radix ScrollArea component's internal border styling.

## Fix

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`

Update the ScrollArea element (around line 119) to override all scrollbar border styling:

- Add CSS overrides to remove borders from the ScrollArea's scrollbar elements: `[&>[data-radix-scroll-area-scrollbar]]:!border-0`
- Also target the viewport to remove any inherited borders: `[&>div]:!border-0`

**File:** `src/components/ui/scroll-area.tsx`

The vertical ScrollBar has `border-l border-l-transparent` which, despite being transparent, can render as a visible line in some browsers due to sub-pixel rendering. This will be left untouched as it affects all ScrollAreas globally. Instead, the fix is scoped to the gallery modal only via the className overrides above.

## Scope
- Single line change in one file
- No functional changes -- only removes the two visual artifact lines

