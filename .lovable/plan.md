

# Add 10 New Place Card Gallery Designs (Batch 5 of 6)

## Overview
Add the fifth batch of 10 place card designs to the gallery with descriptive names and category assignments.

## Image Assignments

| # | Upload File | New Name | Category | File Name |
|---|------------|----------|----------|-----------|
| 41 | Untitled_design_41.png | Black Gold Floral Sparkle | Black | Black_Gold_Floral_Sparkle.png |
| 42 | Untitled_design_42.png | Black Gold Balloon Confetti | Black | Black_Gold_Balloon_Confetti.png |
| 43 | Untitled_design_43.png | Black Gold Wave Glitter | Black | Black_Gold_Wave_Glitter.png |
| 44 | Untitled_design_44.png | Black Gold Balloon Bunting | Black | Black_Gold_Balloon_Bunting.png |
| 45 | Untitled_design_45.png | Royal Blue Gold Stars | Blue | Royal_Blue_Gold_Stars.png |
| 46 | Untitled_design_46.png | Black Gold Disco Celebration | Black | Black_Gold_Disco_Celebration.png |
| 47 | Untitled_design_47.png | Royal Blue Gold Dust | Blue | Royal_Blue_Gold_Dust.png |
| 48 | Untitled_design_48.png | Blue Hydrangea Watercolor Frame | Blue | Blue_Hydrangea_Watercolor_Frame.png |
| 49 | Untitled_design_49.png | Peach Apricot Minimal Border | Orange | Peach_Apricot_Minimal_Border.png |
| 50 | Untitled_design_50.png | Yellow Daisy Petal Scatter | Yellow | Yellow_Daisy_Petal_Scatter.png |

## Notes on Categories
- **Yellow** is a new category (bright yellow floral petals on cream)
- Five designs in **Black** category (dark/gold luxury themes)
- Two designs in **Blue** (royal blue with gold accents + hydrangea watercolor)

## Implementation Steps

1. **Copy all 10 uploaded images** to `public/gallery-images/` with their new descriptive file names.

2. **Insert 10 records** into `place_card_gallery_images` with sort_order values 53-62 (continuing from Batch 4 which ended at 52).

## Technical Details
- Images stored as static assets in `public/gallery-images/`
- Database records inserted via Supabase insert tool with fields: `name`, `category`, `image_url`, `sort_order`
- No code changes needed -- the existing `usePlaceCardGallery` hook automatically picks up new entries

