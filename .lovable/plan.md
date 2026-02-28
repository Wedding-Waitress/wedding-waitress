

# Add 10 New Place Card Gallery Designs (Batch 1 of 6)

## Overview
Add 10 new place card designs uploaded by the user to the gallery, with descriptive names and appropriate category assignments.

## Image Assignments

| # | Upload File | New Name | Category | File Name |
|---|------------|----------|----------|-----------|
| 1 | Untitled_design_1.png | Sage Gold Sparkle | Flowers | Sage_Gold_Sparkle.png |
| 2 | Untitled_design_2.png | Pine Holly Berries | Christmas | Pine_Holly_Berries.png |
| 3 | Untitled_design_3.png | Autumn Sunflower Border | Orange | Autumn_Sunflower_Border.png |
| 4 | Untitled_design_4.png | Golden Ginkgo Leaves | Orange | Golden_Ginkgo_Leaves.png |
| 5 | Untitled_design_5.png | Rustic Sunflower Bouquet | Flowers | Rustic_Sunflower_Bouquet.png |
| 6 | Untitled_design_6.png | Blue Watercolor Bouquet | Blue | Blue_Watercolor_Bouquet.png |
| 7 | Untitled_design_7.png | Sage Eucalyptus Sprigs | Green | Sage_Eucalyptus_Sprigs.png |
| 8 | Untitled_design_8.png | Pastel Cloud Abstract | Pink | Pastel_Cloud_Abstract.png |
| 9 | Untitled_design_9.png | Brown Watercolor Splash | Brown | Brown_Watercolor_Splash.png |
| 10 | Untitled_design_10.png | Sage Gold Drape | Flowers | Sage_Gold_Drape.png |

## Implementation Steps

1. **Copy all 10 uploaded images** to `public/gallery-images/` with their new descriptive file names (PNG format).

2. **Create a SQL migration** to insert all 10 records into `place_card_gallery_images`:
   - Each entry gets the descriptive name, assigned category, image URL path, and a sort order.

## Technical Details

- Images are stored as static assets in `public/gallery-images/`
- Database records are inserted via a Supabase migration with fields: `name`, `category`, `image_url`, `sort_order`
- No code changes needed -- the existing `usePlaceCardGallery` hook automatically picks up new database entries
