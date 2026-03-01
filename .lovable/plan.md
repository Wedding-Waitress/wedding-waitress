

# Add 10 New Cultural Designs to Invitation Image Gallery

## Images to Add

| # | Source File | Gallery Name | Filename |
|---|-----------|-------------|----------|
| 1 | Celebrations_62.png | Chinese Red Lantern Mandala Frame | chinese-red-lantern-mandala-frame.png |
| 2 | Celebrations_63.png | Chinese Lantern Fan Festival | chinese-lantern-fan-festival.png |
| 3 | Celebrations_64.png | Chinese Dragon Coin Frame | chinese-dragon-coin-frame.png |
| 4 | Celebrations_65.png | Chinese Swallow Lantern Ginkgo | chinese-swallow-lantern-ginkgo.png |
| 5 | Celebrations_66.png | Chinese Blue Cloud Scroll Frame | chinese-blue-cloud-scroll-frame.png |
| 6 | Celebrations_67.png | Chinese Lion Dance Temple Gate | chinese-lion-dance-temple-gate.png |
| 7 | Celebrations_68.png | Chinese Cherry Blossom Lanterns | chinese-cherry-blossom-lanterns-watercolor.png |
| 8 | Celebrations_69.png | Chinese Red Fireworks Fan | chinese-red-fireworks-fan.png |
| 9 | Celebrations_70.png | Chinese Red Gold Lantern Lotus | chinese-red-gold-lantern-lotus.png |
| 10 | Celebrations_71.png | Chinese Red Gold Lantern Lotus Alt | chinese-red-gold-lantern-lotus-alt.png |

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with clean descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with category "Cultural" and sort_order 13-22 (continuing from the existing 12 Cultural designs).

This will bring the Invitation Image Gallery from **70 to 80 designs**, and the Cultural category from 12 to 22 designs.

### Technical Details
- Destination: `public/invitation-gallery/` (invitation gallery folder)
- Table: `invitation_gallery_images` (NOT `place_card_gallery_images`)
- Category: Cultural
- No code changes needed

