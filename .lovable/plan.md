

# Fix Image Gallery: White Lines + Duplicate Removal

## Issue 1: White Lines Still Showing

**Root cause found:** The guide lines in `PlaceCardPreview.tsx` use `zIndex: 100`, while the gallery modal content is only at `zIndex: 60` and the overlay at `z-[55]`. The background elements are literally painted **on top** of the modal because they have a higher z-index.

**Fix:** Raise the gallery modal's z-index values above 100:
- **Overlay:** Change from `z-[55]` to `z-[105]` 
- **DialogContent:** Change from `zIndex: 60` to `zIndex: 110`

This keeps the background lines untouched on the Place Cards page while ensuring the gallery modal fully covers them.

**File:** `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx` -- update the `overlayClassName` and `style` props on `DialogContent`.

---

## Issue 2: Duplicate Image in Black Category

The 3rd image in the Black category (marked with red X) is **"Black Smoke"** (`Black_3.jpg`, ID: `dc355c71-6396-41bc-8266-faf381f293b0`). It duplicates the 1st image **"Black Smoke"** (`Black_1.jpg`).

**Fix:** Delete this record from the `place_card_gallery_images` database table.

**Note:** You mentioned there are 8 pages of duplicates. Please share the remaining 7 screenshots and I will remove all duplicates together. For now, I will remove the one shown in this screenshot.

---

## Technical Details

| Change | File | What |
|--------|------|------|
| z-index fix | `PlaceCardGalleryModal.tsx` | Overlay to `z-[105]`, content to `zIndex: 110` |
| Delete duplicate | Database | Remove record `dc355c71-...` from `place_card_gallery_images` |

