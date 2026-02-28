

# Image Gallery Modal UI Fixes

## Changes Overview

Five fixes to the Place Card Image Gallery modal in `PlaceCardGalleryModal.tsx` and one in `dialog.tsx`.

---

## 1. Cancel Button Overlapped by Images

**Problem:** The ScrollArea height of 550px pushes content below the viewport, hiding the Cancel button behind images.

**Fix:** Reduce ScrollArea height from `h-[550px]` to `h-[420px]` (approximately 3 rows of images). The modal dimensions stay the same -- just fewer rows visible with scrolling still available.

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx` (line 120)

---

## 2. Cancel Button Styling

**Problem:** Cancel button is a plain outline button, needs to be red with white text and narrower height.

**Fix:** Change the Cancel button from `variant="outline"` to custom red styling: `bg-red-500 hover:bg-red-600 text-white` with a narrower height `h-8` and appropriate padding.

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx` (lines 163-166)

---

## 3. Search Bar Overlapping the Exit (X) Button

**Problem:** The search input stretches full width and overlaps with the close (X) button in the top-right corner.

**Fix:** Add right padding/margin to the search input container so it only spans ~75% of the width, leaving space for the X button. Change the search `div` from full width to `w-[75%]`.

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx` (line 83)

---

## 4. Close (X) Button Tooltip -- Show "Exit" on Hover

**Problem:** The X button has no visible tooltip; user wants "Exit" to appear on hover.

**Fix:** Add a `title="Exit"` attribute to the `DialogPrimitive.Close` button in the dialog component. Since this is a global component, I'll instead add the tooltip directly in the gallery modal by wrapping or adding a custom close button with a title. To keep it scoped, I'll add a CSS title tooltip via the dialog's close button. The cleanest approach: add `title="Exit"` to the close button in `dialog.tsx`.

**File:** `src/components/ui/dialog.tsx` (line 81)

---

## 5. Total Card Count Next to "Image Gallery" Heading

**Problem:** No indication of how many images are in the gallery.

**Fix:** Add a count badge next to the "Image Gallery" title showing the total number of images (e.g., "Image Gallery (68)"). This will use `images.length` from the hook, displayed as a subtle count in the heading.

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx` (lines 48-51)

---

## Technical Summary

| File | Lines | Change |
|------|-------|--------|
| `PlaceCardGalleryModal.tsx` | 120 | ScrollArea height `h-[550px]` to `h-[420px]` |
| `PlaceCardGalleryModal.tsx` | 163-166 | Cancel button: red bg, white text, `h-8` |
| `PlaceCardGalleryModal.tsx` | 83 | Search input width reduced to `w-[75%]` |
| `PlaceCardGalleryModal.tsx` | 48-51 | Add `({images.length})` to title |
| `dialog.tsx` | 81 | Add `title="Exit"` to close button |

