

# Upload 10 Place Card Gallery Designs (Cultural Category)

## Context
These 10 images are Place Card versions of the Cultural designs already added to the Invitation Gallery. They belong in the `place_card_gallery_images` table (separate from `invitation_gallery_images`). No Chinese/Cultural designs exist in the Place Card gallery yet.

## Design Inventory

| # | Source File | Name | Category | Filename |
|---|------------|------|----------|----------|
| 1 | Celebrations_52-2.png | Chinese Double Happiness Couple | Cultural | chinese-double-happiness-couple.png |
| 2 | Celebrations_53-2.png | Chinese Red Gold Cherry Blossom | Cultural | chinese-red-gold-cherry-blossom.png |
| 3 | Celebrations_54-2.png | Chinese Red Gold Cherry Blank | Cultural | chinese-red-gold-cherry-blank.png |
| 4 | Celebrations_55-2.png | Chinese Lantern Horse Zodiac | Cultural | chinese-lantern-horse-zodiac.png |
| 5 | Celebrations_56-2.png | Chinese Red Lantern Pattern | Cultural | chinese-red-lantern-pattern.png |
| 6 | Celebrations_57-2.png | Chinese Red Gold Fireworks | Cultural | chinese-red-gold-fireworks.png |
| 7 | Celebrations_58-2.png | Chinese Cherry Blossom Fans | Cultural | chinese-cherry-blossom-fans.png |
| 8 | Celebrations_59-2.png | Chinese Lion Dance Firecrackers | Cultural | chinese-lion-dance-firecrackers.png |
| 9 | Celebrations_60-2.png | Chinese Lantern Cloud Frame | Cultural | chinese-lantern-cloud-frame.png |
| 10 | Celebrations_61-2.png | Chinese Gold Floral Frame | Cultural | chinese-gold-floral-frame.png |

## Steps

### 1. Copy images to project
Copy all 10 images into `public/gallery-images/` (the Place Card gallery folder) with clean filenames.

### 2. Insert database records
Insert 10 rows into `place_card_gallery_images` with category "Cultural", sort_order 1-10.

This will bring the Place Card gallery from 162 to **172 designs** and add "Cultural" as a new category.

### Technical Details
- Destination folder: `public/gallery-images/` (not `invitation-gallery/`)
- Table: `place_card_gallery_images` (not `invitation_gallery_images`)
- No code changes needed
