

# Fix: Prevent Place Cards Page Lines from Showing Through Image Gallery Modal

## Problem
Horizontal lines from the Place Cards page are bleeding through the Image Gallery dialog overlay. These lines belong to the Place Cards page and should NOT be removed -- instead, the gallery modal needs to properly sit above them.

## Root Cause
The dialog overlay (`bg-black/80`) is semi-transparent (80% opacity), allowing underlying page elements with high contrast (like borders/separators) to remain faintly visible. The dialog content uses `bg-background` which is opaque, but outside the content area the overlay lets things through.

## Fix

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`

Add a class override on the `DialogContent` to ensure a fully opaque white background, and on the `Dialog` to use a fully opaque overlay specifically for this modal:

1. On the `DialogContent`, add `bg-white` to guarantee full opacity (no theme variable ambiguity)
2. Override the dialog overlay to use `bg-black/95` instead of `bg-black/80` so the underlying page lines cannot bleed through -- this is done by passing a custom `className` with `[&>div[data-radix-overlay]]:bg-black/95` on the wrapping Dialog, or more simply by adding an inline style.

Since we can't easily override the overlay from DialogContent alone, the cleanest approach:
- Add `[&_.fixed.inset-0]:!bg-black/95` on the DialogContent's parent, OR
- Simply wrap the DialogContent's children in a container with `relative z-10 bg-white` to ensure nothing from behind can paint over the modal content area.

**Chosen approach:** Add `!bg-black/95` to the dialog overlay via the DialogContent className targeting the sibling overlay, ensuring the page behind is fully hidden.

Specifically, update the `DialogContent` className to include `bg-white` explicitly for guaranteed opacity.

## Scope
- One className addition in `PlaceCardGalleryModal.tsx`
- No changes to the Place Cards page
- No changes to the global Dialog component

