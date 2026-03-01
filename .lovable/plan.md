

# Add 10 New Invitation Designs to Invitation Image Gallery (Batch 15)

## Images to Add

| # | Source File | Gallery Name | Category | Filename | Sort Order |
|---|-----------|-------------|----------|----------|------------|
| 1 | rsvp_...79.png | Emerald Green Gold Ornate Corner Frame | Glamour | glamour-emerald-green-gold-ornate-corner-frame.png | 3 |
| 2 | rsvp_...81.png | Orange Peach Watercolor Rose Corner Frame | Floral | floral-orange-peach-watercolor-rose-corner-frame.png | 99 |
| 3 | rsvp_...84.png | Dark Botanical Circle Gold Ornate Frame | Glamour | glamour-dark-botanical-circle-gold-ornate-frame.png | 4 |
| 4 | rsvp_...85.png | Pink Watercolor Rose Blush Save The Date | Floral | floral-pink-watercolor-rose-blush-save-the-date.png | 100 |
| 5 | rsvp_...86.png | Blush Pink Watercolor Rose Corner Minimal | Floral | floral-blush-pink-watercolor-rose-corner-minimal.png | 101 |
| 6 | rsvp_...88.png | Blue Indigo Wildflower Berry Corner Bold | Floral | floral-blue-indigo-wildflower-berry-corner-bold.png | 102 |
| 7 | rsvp_...89.png | Soft Green Leaf Watercolor Side Border | Floral | floral-soft-green-leaf-watercolor-side-border.png | 103 |
| 8 | rsvp_...91.png | Dark Autumn Floral Bold Corner Frame | Floral | floral-dark-autumn-floral-bold-corner-frame.png | 104 |
| 9 | rsvp_...92.png | Beige Rose Watercolor Rectangle Frame | Floral | floral-beige-rose-watercolor-rectangle-frame.png | 105 |
| 10 | rsvp_...94.png | Gold Floral Birds Butterfly Border Frame | Floral | floral-gold-floral-birds-butterfly-border-frame.png | 106 |

## Category Breakdown
- **Floral**: 8 new designs (sort_order 99-106, continuing from existing 98)
- **Glamour**: 2 new designs (sort_order 3-4, continuing from existing 2)

## Steps

### 1. Copy 10 images to invitation gallery folder
Copy all 10 uploaded images into `public/invitation-gallery/` with descriptive filenames.

### 2. Insert 10 database records
Insert into `invitation_gallery_images` table with appropriate categories and sort_orders.

This will bring the Invitation Image Gallery from **240 to 250 designs**.

### Technical Details
- Destination: `public/invitation-gallery/`
- Table: `invitation_gallery_images`
- No code changes needed -- gallery is database-driven

