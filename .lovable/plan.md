

# Add Red_1 Image to Gallery

## What will be done

1. Upload `000._Red_1.jpg` to Supabase Storage bucket `place-card-gallery` under the `red/` folder as `Red_1.jpg`
2. Insert a new record into `place_card_gallery_images` table with:
   - **Name:** "Red 1"
   - **Category:** "Red"
   - **image_url:** The public storage URL
   - **sort_order:** 1 (first in Red category, before existing Red entries)

3. Continue waiting for next batch of images to process

## Technical Details

- The uploaded file `user-uploads://000._Red_1.jpg` will be fetched in-browser, converted to base64, and sent to the `fix-gallery-upload` edge function
- A temporary page or script will handle the upload, then a database insert will add the gallery record
- Existing Red category images (Red_2, Red_4, Red_5, Red_6) are already working and won't be touched

