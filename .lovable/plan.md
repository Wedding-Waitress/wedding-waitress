

# Add 10 New Invitation Designs to Invitation Image Gallery

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | rsvp_...040954.png | Floral White Rose Blackberry Greenery Frame | Floral | floral-white-rose-blackberry-greenery-frame.png | 14 |
| 2 | rsvp_...041035.png | Floral Red Watercolor Flower Minimal | Floral | floral-red-watercolor-flower-minimal.png | 15 |
| 3 | rsvp_...041056.png | Floral Eucalyptus Greenery Watercolor | Floral | floral-eucalyptus-greenery-watercolor.png | 16 |
| 4 | rsvp_...041113.png | Floral Gold Lotus Line Art | Floral | floral-gold-lotus-line-art.png | 17 |
| 5 | rsvp_...041211.png | Wedding Burgundy Floral Gold Frame | Wedding | wedding-burgundy-floral-gold-frame.png | 5 |
| 6 | rsvp_...041230.png | Floral White Rose Blackberry Full Border | Floral | floral-white-rose-blackberry-full-border.png | 18 |
| 7 | rsvp_...041247.png | Floral Purple Watercolor Blossom | Floral | floral-purple-watercolor-blossom.png | 19 |
| 8 | rsvp_...041343.png | Floral Colorful Wildflower Arch Kraft | Floral | floral-colorful-wildflower-arch-kraft.png | 20 |
| 9 | rsvp_...041411.png | Floral Marble White Rose Vine | Floral | floral-marble-white-rose-vine.png | 21 |
| 10 | rsvp_...041501.png | Floral Blush Neutral Flower Frame | Floral | floral-blush-neutral-flower-frame.png | 22 |

## Category Breakdown
- **Floral**: 9 new designs (sort_order 14-22, continuing from existing 13)
- **Wedding**: 1 new design (sort_order 5, continuing from existing 4)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **110 to 120 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

