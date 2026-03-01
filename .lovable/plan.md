

# Add 10 New Invitation Designs to Invitation Image Gallery

## Images to Add

| # | Source File | Gallery Name | Category | Filename |
|---|-----------|-------------|----------|----------|
| 1 | Celebrations_72.png | Red Fireworks Gold Bokeh | Celebrations | red-fireworks-gold-bokeh.png |
| 2 | Celebrations_73.png | Purple Baroque Ornate Frame | Glamour | purple-baroque-ornate-frame.png |
| 3 | Celebrations_74.png | Islamic Calligraphy Wedding White Gold | Islamic | islamic-calligraphy-wedding-white-gold.png |
| 4 | Celebrations_75.png | Islamic Gold Mosque Lanterns | Islamic | islamic-gold-mosque-lanterns.png |
| 5 | Celebrations_76.png | Islamic Gold Arch Mosque Mandala | Islamic | islamic-gold-arch-mosque-mandala.png |
| 6 | Celebrations_77.png | Islamic Lanterns Crescent Moon Mandala | Islamic | islamic-lanterns-crescent-moon-mandala.png |
| 7 | Celebrations_78.png | Islamic Gold Geometric Arch Mosque | Islamic | islamic-gold-geometric-arch-mosque.png |
| 8 | Celebrations_79.png | Islamic Gold Star Lanterns Crescent | Islamic | islamic-gold-star-lanterns-crescent.png |
| 9 | Celebrations_80.png | Islamic Purple Wedding Couple Gold | Islamic | islamic-purple-wedding-couple-gold.png |
| 10 | Celebrations_81.png | Islamic Purple Calligraphy Butterflies | Islamic | islamic-purple-calligraphy-butterflies.png |

## Category Breakdown
- **Celebrations**: 1 new design (sort_order 5, continuing from existing 4)
- **Glamour**: 1 new design (sort_order 2, continuing from existing 1)
- **Islamic**: 8 new designs (sort_order 3-10, continuing from existing 2)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders continuing from each category's existing maximum.

This will bring the Invitation Image Gallery from **80 to 90 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images` (NOT `place_card_gallery_images`)
- No code changes needed -- gallery is database-driven

