

# Add 10 New Invitation Designs to Invitation Image Gallery (Batch 16)

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | rsvp_...95.png | Gold Line Art Peony Corner Satin White | Glamour | glamour-gold-line-art-peony-corner-satin-white.png | 5 |
| 2 | rsvp_...96.png | Pink Anemone Gold Geometric Double Frame | Floral | floral-pink-anemone-gold-geometric-double-frame.png | 107 |
| 3 | rsvp_...97.png | Orange Citrus Blossom Rectangle Frame | Tropical | tropical-orange-citrus-blossom-rectangle-frame.png | 5 |
| 4 | rsvp_...98.png | Boho Rose Pampas Fairy Lights Kraft | Floral | floral-boho-rose-pampas-fairy-lights-kraft.png | 108 |
| 5 | rsvp_...99.png | Purple Watercolor Rose Eucalyptus Rectangle | Floral | floral-purple-watercolor-rose-eucalyptus-rectangle.png | 109 |
| 6 | rsvp_...100.png | Blue Watercolor Rose Gold Circle Frame | Floral | floral-blue-watercolor-rose-gold-circle-frame.png | 110 |
| 7 | rsvp_...png (no number) | Eucalyptus Watercolor Diagonal Corner Clean | Floral | floral-eucalyptus-watercolor-diagonal-corner-clean.png | 111 |
| 8 | Untitled_design_1-2.png | Purple Watercolor Floral Circle Wreath | Floral | floral-purple-watercolor-floral-circle-wreath.png | 112 |
| 9 | Untitled_design_2-2.png | Purple Watercolor Floral Top Bottom Border | Floral | floral-purple-watercolor-floral-top-bottom-border.png | 113 |
| 10 | Untitled_design_3-2.png | Boho Palm Orchid Gold Glitter Splatter Frame | Floral | floral-boho-palm-orchid-gold-glitter-splatter-frame.png | 114 |

## Category Breakdown
- **Floral**: 8 new designs (sort_order 107-114, continuing from existing 106)
- **Glamour**: 1 new design (sort_order 5, continuing from existing 4)
- **Tropical**: 1 new design (sort_order 5, continuing from existing 4)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **250 to 260 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

