

# Add 10 New Islamic Designs to Invitation Image Gallery

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | Celebrations_82.png | Islamic Blue Floral Lanterns Calligraphy | Islamic | islamic-blue-floral-lanterns-calligraphy.png | 11 |
| 2 | Celebrations_83.png | Islamic Rose Gold Arch Blessing | Islamic | islamic-rose-gold-arch-blessing.png | 12 |
| 3 | Celebrations_84.png | Islamic Rose Gold Arch Calligraphy | Islamic | islamic-rose-gold-arch-calligraphy.png | 13 |
| 4 | Celebrations_85.png | Islamic Gold Floral Arch Ornate | Islamic | islamic-gold-floral-arch-ornate.png | 14 |
| 5 | Celebrations_86.png | Islamic Pink Lily Blossom Arch | Islamic | islamic-pink-lily-blossom-arch.png | 15 |
| 6 | Celebrations_87.png | Islamic Maroon Gold Lantern Mandala | Islamic | islamic-maroon-gold-lantern-mandala.png | 16 |
| 7 | Celebrations_88.png | Islamic Green Rose Nikah Gold Frame | Islamic | islamic-green-rose-nikah-gold-frame.png | 17 |
| 8 | Celebrations_89.png | Islamic Green Rose Butterfly Gold | Islamic | islamic-green-rose-butterfly-gold.png | 18 |
| 9 | Celebrations_90.png | Islamic White Rose Nikah Watercolor | Islamic | islamic-white-rose-nikah-watercolor.png | 19 |
| 10 | Celebrations_91.png | Islamic White Rose Eucalyptus Gold | Islamic | islamic-white-rose-eucalyptus-gold.png | 20 |

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with category "Islamic" and sort_order 11-20 (continuing from the existing 10 Islamic designs).

This will bring the Invitation Image Gallery from **90 to 100 designs**, and the Islamic category from 10 to 20 designs.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images` (NOT `place_card_gallery_images`)
- Category: Islamic
- No code changes needed -- gallery is database-driven

