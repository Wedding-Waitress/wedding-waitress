

# Add 10 New Invitation Designs to Invitation Image Gallery

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | rsvp_...042158.png | Floral Boho Orchid Trailing Greenery | Floral | floral-boho-orchid-trailing-greenery.png | 32 |
| 2 | rsvp_...042220.png | Floral Poppy Cornflower Wildflower Frame | Floral | floral-poppy-cornflower-wildflower-frame.png | 33 |
| 3 | rsvp_...042237.png | Floral Brown Kraft Peach Daisy Corner | Floral | floral-brown-kraft-peach-daisy-corner.png | 34 |
| 4 | rsvp_...042331.png | Floral Rose Eucalyptus Pampas Wheat | Floral | floral-rose-eucalyptus-pampas-wheat.png | 35 |
| 5 | rsvp_...042342.png | Floral Sage Gold Arch Leaf Frame | Floral | floral-sage-gold-arch-leaf-frame.png | 36 |
| 6 | rsvp_...042400.png | Floral Burgundy Pink Rose Full Border | Floral | floral-burgundy-pink-rose-full-border.png | 37 |
| 7 | rsvp_...042422.png | Wedding Boho Pampas Rose Geometric Frame | Wedding | wedding-boho-pampas-rose-geometric-frame.png | 7 |
| 8 | rsvp_...042459.png | Floral Purple Lilac Rose Border Frame | Floral | floral-purple-lilac-rose-border-frame.png | 38 |
| 9 | rsvp_...042510.png | Floral Purple Lilac Rose Top Bottom | Floral | floral-purple-lilac-rose-top-bottom.png | 39 |
| 10 | rsvp_...042539.png | Floral Pink Rose Gold Leaf Top Header | Floral | floral-pink-rose-gold-leaf-top-header.png | 40 |

## Category Breakdown
- **Floral**: 9 new designs (sort_order 32-40, continuing from existing 31)
- **Wedding**: 1 new design (sort_order 7, continuing from existing 6)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **130 to 140 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

