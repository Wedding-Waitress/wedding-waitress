

# Image Gallery Updates

## 3 Changes

### 1. Move Islamic images to "Gold" category and delete the Islamic category
The two Islamic images appear to be gold-themed lantern/ornamental designs, so "Gold" is the most suitable category. This requires two SQL UPDATE statements on the `place_card_gallery_images` table to change their category from "Islamic" to "Gold". Since categories are derived dynamically from the data, removing all "Islamic" entries automatically removes the category.

**Action:** Run SQL via Supabase to update records where `category = 'Islamic'` to `category = 'Gold'`.

### 2. Delete "Autumn Spice White Timber" image
Remove this image from the `place_card_gallery_images` table and optionally from storage.

**Action:** Run SQL via Supabase to delete the record where `name = 'Autumn Spice White Timber'`.

### 3. Restyle "Use This Image" button -- center it and make it green
Currently the button is right-aligned with a purple gradient. Change the preview header layout so the button is centered, and use a green background (`bg-green-500 hover:bg-green-600 text-white`) consistent with the app's primary action button standard.

**File:** `PlaceCardGalleryModal.tsx`, lines 57-69

**Current layout:** flex row with Back button (left), title (center/flex-1), Use This Image (right)

**New layout:** Two rows:
- Row 1: Back button (left) + title (center)
- Row 2: "Use This Image" button centered with green styling

