

# Upload First 10 Invitation Gallery Designs

## Design Inventory

| # | Proposed Name | Category | Source File |
|---|--------------|----------|-------------|
| 1 | Blush Peonies Bismillah | Islamic | Brown_Flowers_1.png |
| 2 | Navy & Gold Rings | Wedding | Celebrations_...145837.png |
| 3 | Black & Gold Monstera | Tropical | Celebrations_...145857.png |
| 4 | Gold Birthday Bash | Birthday | Celebrations_...145925.png |
| 5 | Rose Gold Glitter | Glamour | Celebrations_...145940.png |
| 6 | Burgundy Lanterns | Islamic | Celebrations_...150143.png |
| 7 | Golden Bow Classic | Wedding | Celebrations_...150209.png |
| 8 | Blush Watercolor Roses | Floral | Celebrations_...150256.png |
| 9 | Pink Magnolia | Floral | Celebrations_...150315.png |
| 10 | Golden Balloons Bokeh | Celebrations | Celebrations_1.png |

## Categories Created (5 total so far)

- **Islamic** (2 designs)
- **Wedding** (2 designs)
- **Floral** (2 designs)
- **Tropical** (1 design)
- **Birthday** (1 design)
- **Glamour** (1 design)
- **Celebrations** (1 design)

## Implementation Steps

### 1. Copy images to project

Copy all 10 uploaded images into `public/invitation-gallery/` with clean, URL-friendly filenames (e.g., `blush-peonies-bismillah.png`).

### 2. Create/update edge function for invitation gallery upload

Adapt the existing `fix-gallery-upload` edge function pattern to upload images to a Supabase Storage bucket for invitation gallery images. The function will:
- Accept base64-encoded image data
- Upload to the `invitation-gallery` storage bucket
- Return the public URL

### 3. Insert records into `invitation_gallery_images` table

For each of the 10 designs, insert a row with:
- `name`: The design name from the table above
- `category`: The category from the table above
- `image_url`: The public storage URL after upload
- `sort_order`: Sequential within each category

### 4. Verify gallery loads in the Invitations page

Ensure the `useInvitationGallery` hook fetches and displays the new images correctly, grouped by category.

## Files Created/Modified

1. `public/invitation-gallery/*.png` -- 10 image files copied from uploads
2. `supabase/functions/upload-invitation-gallery/index.ts` -- New edge function for uploading to storage bucket
3. Supabase `invitation_gallery_images` table -- 10 new rows inserted via the edge function

