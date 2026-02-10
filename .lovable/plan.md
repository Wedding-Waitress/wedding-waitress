

# Fix Broken Gallery Images in Supabase Storage

## Problem
All 25 images in the `place-card-gallery` Supabase Storage bucket are corrupted. When the edge function tried to fetch them from the app's public URL, it received the Vite SPA HTML page (~134KB) instead of the actual image files. This is why every image uploaded via edge function shows as broken.

## Root Cause
The edge function fetched images from the preview URL (e.g., `https://...lovable.app/gallery-images/Blue_1.jpg`), but the server returned the app's `index.html` instead of the static file. The files were saved with `text/html` mimetype.

## Solution
Delete all 25 corrupted files from storage and re-upload them using a revised edge function that reads the images directly from the project's `public/gallery-images/` directory using a different approach -- reading the raw file bytes from the published site or using base64-encoded data.

**However**, since the edge function cannot reliably fetch from the preview URL, the best approach is:

1. Create an edge function that accepts image data as base64 in the request body and uploads it to storage
2. Call it from the browser (where the images in `public/gallery-images/` are accessible) to upload each file

### Step-by-step

1. **Delete all 25 corrupted files** from the `place-card-gallery` bucket via SQL
2. **Create a temporary edge function** (`fix-gallery-upload`) that:
   - Accepts a POST with `{ fileName, folderPath, imageDataUrl }` 
   - Uploads the base64-decoded image to the correct path in storage
3. **Create a temporary admin page/script** that:
   - Reads each image from `public/gallery-images/` via fetch (works in-browser)
   - Converts to base64
   - Sends to the edge function for upload
4. **Run the upload** from the browser
5. **Clean up** the temporary edge function and script

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/fix-gallery-upload/index.ts` | Create temporary edge function |
| SQL migration | Delete corrupted storage objects |
| Temporary browser script (inline in edge function call) | Upload images from browser |
| Cleanup | Delete edge function after completion |

### Images to Re-upload (25 total)

**Blue (3):** Wedding_Waitress_43934197_XL.jpg, Wedding_Waitress_46752785_XL.jpg, White_Blossoms_on_Turquoise.jpg
**Brown (1):** Wedding_Waitress_112430572_XL.jpg
**Christmas (4):** Christmas_1.jpg, Christmas_2.jpg, Christmas_3.jpg, Wedding_Waitress_613771420_XL.jpg
**Green (2):** Eucalyptus_on_Blush.jpg, Eucalyptus_on_Lavender.jpg
**Islamic (2):** Islamic_1.jpg, Islamic_2.jpg
**Pink (6):** Pink_Tulips_on_Timber.jpg, Pink_Carnations_on_Timber.jpg, Pink_Tulips_Side.jpg, Pink_Peonies_on_Timber.jpg, Wedding_Waitress_497593504_XL-2.jpg, Wedding_Waitress_826407602_XL.jpg
**Rainbow (3):** Wedding_Waitress_1923247_XL.jpg, Red_and_Yellow_Tulips.jpg, Spring_Tulip_Bouquet.jpg
**Red (2):** Wedding_Waitress_108648998_XL.jpg, Red_Roses_on_Timber.jpg
**White (2):** Wedding_Waitress_599699858_XL.jpg, Wedding_Waitress_639146570_XL.jpg

### Database Records
No database changes needed -- the `place_card_gallery_images` records and URLs are correct. Only the actual storage files need to be replaced.

