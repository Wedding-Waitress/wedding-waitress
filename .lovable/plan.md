

# Add 10 New Invitation Designs to Invitation Image Gallery (Batch 18)

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | Untitled_design_14-2.png | Christmas Red Stars Gold Trees Sparkle Frame | Celebrations | celebrations-christmas-red-stars-gold-trees-sparkle-frame.png | 7 |
| 2 | Untitled_design_15-2.png | Christmas Party Santa Reindeer Snowflake Red | Celebrations | celebrations-christmas-party-santa-reindeer-snowflake-red.png | 8 |
| 3 | Untitled_design_16-2.png | Winter Blue Snowflake Pine Forest Scene | Celebrations | celebrations-winter-blue-snowflake-pine-forest-scene.png | 9 |
| 4 | Untitled_design_17-2.png | Christmas Party Tree Gifts Cream Minimal | Celebrations | celebrations-christmas-party-tree-gifts-cream-minimal.png | 10 |
| 5 | Untitled_design_18-2.png | Christmas Poinsettia Watercolor Ornament White | Celebrations | celebrations-christmas-poinsettia-watercolor-ornament-white.png | 11 |
| 6 | Untitled_design_19-2.png | Christmas Gingerbread Cinnamon Pine Dotted | Celebrations | celebrations-christmas-gingerbread-cinnamon-pine-dotted.png | 12 |
| 7 | Untitled_design_20-2.png | Christmas Candy Stripe Bow Ornament Frame | Celebrations | celebrations-christmas-candy-stripe-bow-ornament-frame.png | 13 |
| 8 | Untitled_design_21-2.png | Dark Navy Silver Glitter Leaf Rectangle Frame | Glamour | glamour-dark-navy-silver-glitter-leaf-rectangle-frame.png | 9 |
| 9 | Untitled_design_22-2.png | Christmas Blue Gold Deer Pine Watercolor | Celebrations | celebrations-christmas-blue-gold-deer-pine-watercolor.png | 14 |
| 10 | Untitled_design_23-2.png | Black Gold Champagne Glasses Celebration | Celebrations | celebrations-black-gold-champagne-glasses-celebration.png | 15 |

## Category Breakdown
- **Celebrations**: 9 new designs (sort_order 7-15)
- **Glamour**: 1 new design (sort_order 9)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **270 to 280 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

