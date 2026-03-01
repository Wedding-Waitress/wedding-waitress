

# Add 10 New Invitation Designs to Invitation Image Gallery (Batch 13)

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | rsvp_...44-2.png | Taupe Line Art Floral Corner Sketch | Floral | floral-taupe-line-art-floral-corner-sketch.png | 82 |
| 2 | rsvp_...46-2.png | Peach Watercolor Greenery Border Frame | Floral | floral-peach-watercolor-greenery-border-frame.png | 83 |
| 3 | rsvp_...48-2.png | Botanical Circle Wreath Line Drawing | Floral | floral-botanical-circle-wreath-line-drawing.png | 84 |
| 4 | rsvp_...50-2.png | Olive Branch Watercolor Circle Frame | Floral | floral-olive-branch-watercolor-circle-frame.png | 85 |
| 5 | rsvp_...51-2.png | Olive Leaf Watercolor Diagonal Corner | Floral | floral-olive-leaf-watercolor-diagonal-corner.png | 86 |
| 6 | rsvp_...53-2.png | Boho Anthurium Dahlia Palm Fan Corner | Floral | floral-boho-anthurium-dahlia-palm-fan-corner.png | 87 |
| 7 | rsvp_...55-2.png | Burnt Orange Watercolor Leaf Rectangle | Floral | floral-burnt-orange-watercolor-leaf-rectangle.png | 88 |
| 8 | rsvp_...57-2.png | Gold Floral Line Art Watercolor Wash | Glamour | glamour-gold-floral-line-art-watercolor-wash.png | 2 |
| 9 | rsvp_...59-2.png | Pastel Wildflower Watercolor Garden Full | Floral | floral-pastel-wildflower-watercolor-garden-full.png | 89 |
| 10 | rsvp_...60-2.png | Pastel Wildflower Watercolor Garden Sparse | Floral | floral-pastel-wildflower-watercolor-garden-sparse.png | 90 |

## Category Breakdown
- **Floral**: 9 new designs (sort_order 82-90, continuing from existing 81)
- **Glamour**: 1 new design (sort_order 2, continuing from existing 1)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **220 to 230 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

