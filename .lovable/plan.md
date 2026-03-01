

# Add 10 New Invitation Designs to Invitation Image Gallery (Batch 12)

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | rsvp_...25.png | Eucalyptus Gold Spatter Watercolor Corner | Floral | floral-eucalyptus-gold-spatter-watercolor-corner.png | 75 |
| 2 | rsvp_...26.png | Vintage Hydrangea Lily Botanical Textured | Floral | floral-vintage-hydrangea-lily-botanical-textured.png | 76 |
| 3 | rsvp_...27.png | Rustic Wood Lace Border Cream Panel | Wedding | wedding-rustic-wood-lace-border-cream-panel.png | 9 |
| 4 | rsvp_...29.png | Autumn Rose Pinecone Berry Cloud Frame | Floral | floral-autumn-rose-pinecone-berry-cloud-frame.png | 77 |
| 5 | rsvp_...32.png | Gold Botanical Line Art Border Frame | Wedding | wedding-gold-botanical-line-art-border-frame.png | 10 |
| 6 | rsvp_...34.png | Sunflower Watercolor Border Garden | Floral | floral-sunflower-watercolor-border-garden.png | 78 |
| 7 | rsvp_...36.png | Sage Green Leaf Sparkle Rectangle Frame | Floral | floral-sage-green-leaf-sparkle-rectangle-frame.png | 79 |
| 8 | rsvp_...38.png | Rustic Stone Leaf Gold Ornament Corner | Wedding | wedding-rustic-stone-leaf-gold-ornament-corner.png | 11 |
| 9 | rsvp_...40.png | Grey Lily Line Art Geometric Frame | Floral | floral-grey-lily-line-art-geometric-frame.png | 80 |
| 10 | rsvp_...42.png | White Peony Rose Gold Branch Marble | Floral | floral-white-peony-rose-gold-branch-marble.png | 81 |

## Category Breakdown
- **Floral**: 7 new designs (sort_order 75-81, continuing from existing 74)
- **Wedding**: 3 new designs (sort_order 9-11, continuing from existing 8)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **210 to 220 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

