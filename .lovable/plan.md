

# Add 10 New Place Card Gallery Designs (Batch 2 of 6)

## Overview
Add the second batch of 10 place card designs to the gallery with descriptive names and category assignments based on visual inspection.

## Image Assignments

| # | Upload File | New Name | Category | File Name |
|---|------------|----------|----------|-----------|
| 11 | Untitled_design_11.png | Vintage Rose Garden Border | Flowers | Vintage_Rose_Garden_Border.png |
| 12 | Untitled_design_12.png | Pink Roses Gold Frame | Pink | Pink_Roses_Gold_Frame.png |
| 13 | Untitled_design_13.png | Gold Line Art Botanicals | Gold | Gold_Line_Art_Botanicals.png |
| 14 | Untitled_design_14.png | Gold Lace Ornate Border | Gold | Gold_Lace_Ornate_Border.png |
| 15 | Untitled_design_15.png | Gold Silk Ribbon Waves | Gold | Gold_Silk_Ribbon_Waves.png |
| 16 | Untitled_design_16.png | Mocha Floral Corners | Brown | Mocha_Floral_Corners.png |
| 17 | Untitled_design_17.png | Peach Watercolor Blooms | Orange | Peach_Watercolor_Blooms.png |
| 18 | Untitled_design_18.png | Pink Rose Garden Frame | Pink | Pink_Rose_Garden_Frame.png |
| 19 | Untitled_design_19.png | Deep Rose Floral Border | Pink | Deep_Rose_Floral_Border.png |
| 20 | Untitled_design_20.png | Blush Rose Eucalyptus Frame | Pink | Blush_Rose_Eucalyptus_Frame.png |

## Notes on Categories
- **Gold** is a new category (3 images feature gold as the dominant design element -- line art, lace border, and silk ribbons)
- If Gold doesn't exist yet, it will be created automatically when the database records are inserted

## Implementation Steps

1. **Copy all 10 uploaded images** to `public/gallery-images/` with their new descriptive file names.

2. **Insert 10 records** into `place_card_gallery_images` with sort_order values 23-32 (continuing from Batch 1 which ended at 22).

## Technical Details
- Images stored as static assets in `public/gallery-images/`
- Database records inserted via Supabase with fields: `name`, `category`, `image_url`, `sort_order`
- No code changes needed -- the existing `usePlaceCardGallery` hook automatically picks up new entries

