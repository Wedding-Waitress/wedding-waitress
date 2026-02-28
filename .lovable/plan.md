

# Add 10 New Place Card Gallery Designs (Batch 4 of 6)

## Overview
Add the fourth batch of 10 place card designs to the gallery with descriptive names and category assignments.

## Image Assignments

| # | Upload File | New Name | Category | File Name |
|---|------------|----------|----------|-----------|
| 31 | Untitled_design_31.png | Blush Wildflower Meadow | Pink | Blush_Wildflower_Meadow.png |
| 32 | Untitled_design_32.png | Amber Rose Butterfly Garden | Orange | Amber_Rose_Butterfly_Garden.png |
| 33 | Untitled_design_33.png | Lavender Watercolor Splash | Blue | Lavender_Watercolor_Splash.png |
| 34 | Untitled_design_34.png | Blue Chinoiserie Vine Frame | Blue | Blue_Chinoiserie_Vine_Frame.png |
| 35 | Untitled_design_35.png | Teal Gold Floral Wreath | Flowers | Teal_Gold_Floral_Wreath.png |
| 36 | Untitled_design_36.png | Rustic Sunflower Parchment | Brown | Rustic_Sunflower_Parchment.png |
| 37 | Untitled_design_37.png | Gold Ornate Floral Frame | Gold | Gold_Ornate_Floral_Frame.png |
| 38 | Untitled_design_38.png | Silver Leaf Watercolor Wash | Grey | Silver_Leaf_Watercolor_Wash.png |
| 39 | Untitled_design_39.png | Black Gold Art Deco Pampas | Black | Black_Gold_Art_Deco_Pampas.png |
| 40 | Untitled_design_40.png | Black Gold Floral Line Art | Black | Black_Gold_Floral_Line_Art.png |

## Notes on Categories
- **Grey** is a new category (silver/grey toned design)
- **Black** is a new category (2 dark/black background designs with gold accents)

## Implementation Steps

1. **Copy all 10 uploaded images** to `public/gallery-images/` with their new descriptive file names.

2. **Insert 10 records** into `place_card_gallery_images` with sort_order values 43-52 (continuing from Batch 3 which ended at 42).

## Technical Details
- Images stored as static assets in `public/gallery-images/`
- Database records inserted via Supabase insert tool with fields: `name`, `category`, `image_url`, `sort_order`
- No code changes needed -- the existing `usePlaceCardGallery` hook automatically picks up new entries

