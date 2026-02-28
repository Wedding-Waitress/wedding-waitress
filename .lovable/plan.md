

# Upload 10 New Invitation Gallery Designs (Batch 6)

## Design Inventory

| # | Source File | Proposed Name | Category | Filename |
|---|------------|---------------|----------|----------|
| 1 | Celebrations_42.png | Yellow Floral Wedding Gold Frame | Wedding | yellow-floral-wedding-gold-frame.png |
| 2 | Celebrations_43.png | Yellow Floral Blank | Floral | yellow-floral-blank.png |
| 3 | Celebrations_44.png | Burgundy Peony Wedding | Wedding | burgundy-peony-wedding.png |
| 4 | Celebrations_45.png | Burgundy Peony Blank | Floral | burgundy-peony-blank.png |
| 5 | Celebrations_46.png | Pink Rose Watercolor Frame | Floral | pink-rose-watercolor-frame.png |
| 6 | Celebrations_47.png | Autumn Sunflower Wreath Frame | Floral | autumn-sunflower-wreath-frame.png |
| 7 | Celebrations_48.png | Lavender Bouquet Arch | Floral | lavender-bouquet-arch.png |
| 8 | Celebrations_49.png | Yellow Tulip Corner Frame | Floral | yellow-tulip-corner-frame.png |
| 9 | Celebrations_50.png | Chinese Wedding Red | Cultural | chinese-wedding-red.png |
| 10 | Celebrations_51.png | Chinese Wedding Red Blank | Cultural | chinese-wedding-red-blank.png |

## Category Updates

- **Wedding**: 2 more designs (sort_order 3-4), bringing total to 4
- **Floral**: 6 more designs (sort_order 7-12), bringing total to 12
- **Cultural**: New category with 2 designs (sort_order 1-2)

## Running Gallery Total After This Batch

60 designs across 10 categories: Baby Shower (21), Floral (12), Religious (9), Celebrations (4), Tropical (4), Wedding (4), Cultural (2), Islamic (2), Birthday (1), Glamour (1).

## Steps

### 1. Copy images to project
Copy all 10 uploaded images into `public/invitation-gallery/` with clean filenames.

### 2. Insert database records
Insert 10 rows into `invitation_gallery_images` table:
- Wedding: sort_order 3-4 (existing has 1-2)
- Floral: sort_order 7-12 (existing has 1-6)
- Cultural: sort_order 1-2 (new category)

### Technical Details
- Files: `public/invitation-gallery/*.png` (10 new files)
- Database: 10 new rows via data insert tool
- No code changes needed

