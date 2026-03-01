

# Add 10 New Invitation Designs to Invitation Image Gallery (Batch 17)

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | Untitled_design_4-2.png | Dark Burgundy Rose Gold Dust Corner Frame | Glamour | glamour-dark-burgundy-rose-gold-dust-corner-frame.png | 6 |
| 2 | Untitled_design_5-2.png | Islamic Bismillah Pastel Botanical Corner Frame | Islamic | islamic-bismillah-pastel-botanical-corner-frame.png | 3 |
| 3 | Untitled_design_6-2.png | Green Leaf Gold Rectangle Frame Cream | Floral | floral-green-leaf-gold-rectangle-frame-cream.png | 115 |
| 4 | Untitled_design_7-2.png | Autumn Rose Watercolor Warm Corner Frame | Floral | floral-autumn-rose-watercolor-warm-corner-frame.png | 116 |
| 5 | Untitled_design_8-2.png | Dark Burgundy Peony Gold Double Frame | Glamour | glamour-dark-burgundy-peony-gold-double-frame.png | 7 |
| 6 | Untitled_design_9-2.png | Burgundy Peony Confetti Side Border Frame | Floral | floral-burgundy-peony-confetti-side-border-frame.png | 117 |
| 7 | Untitled_design_10-2.png | Maroon White Rose Gold Geometric Frame | Glamour | glamour-maroon-white-rose-gold-geometric-frame.png | 8 |
| 8 | Untitled_design_11-2.png | Pink Rose Watercolor Arch Frame | Floral | floral-pink-rose-watercolor-arch-frame.png | 118 |
| 9 | Untitled_design_12-2.png | Christmas Santa Hat Holly Berry | Celebrations | celebrations-christmas-santa-hat-holly-berry.png | 5 |
| 10 | Untitled_design_13-2.png | Christmas Candy Cane Pine Lights Frame | Celebrations | celebrations-christmas-candy-cane-pine-lights-frame.png | 6 |

## Category Breakdown
- **Floral**: 4 new designs (sort_order 115-118)
- **Glamour**: 3 new designs (sort_order 6-8)
- **Celebrations**: 2 new designs (sort_order 5-6)
- **Islamic**: 1 new design (sort_order 3)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **260 to 270 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

