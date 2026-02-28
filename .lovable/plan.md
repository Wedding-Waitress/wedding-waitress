

# Upload 10 New Invitation Gallery Designs (Batch 4)

## Design Inventory

| # | Source File | Proposed Name | Category | Filename |
|---|------------|---------------|----------|----------|
| 1 | Celebrations_22.png | Blue Bear Hot Air Balloon | Baby Shower | blue-bear-hot-air-balloon.png |
| 2 | Celebrations_23.png | Blue Bear Hot Air Balloon Blank | Baby Shower | blue-bear-hot-air-balloon-blank.png |
| 3 | Celebrations_24.png | Gold Script Bear Balloons | Baby Shower | gold-script-bear-balloons.png |
| 4 | Celebrations_25.png | Gold Script Bear Blank | Baby Shower | gold-script-bear-blank.png |
| 5 | Celebrations_26.png | Lemon Stripes | Tropical | lemon-stripes.png |
| 6 | Celebrations_27.png | Citrus Fruit Border | Tropical | citrus-fruit-border.png |
| 7 | Celebrations_28.png | Mediterranean Tile Lemon | Tropical | mediterranean-tile-lemon.png |
| 8 | Celebrations_29.png | Blue Watercolor Communion | Religious | blue-watercolor-communion.png |
| 9 | Celebrations_30.png | Gold Cross Communion | Religious | gold-cross-communion.png |
| 10 | Celebrations_31.png | Lily Cross Minimal | Religious | lily-cross-minimal.png |

## New Categories Added

- **Religious** (3 designs) -- brand new category for communion/christening designs
- **Tropical** (3 more designs added, bringing total to 4)
- **Baby Shower** (4 more designs, bringing total to 21)

## Running Gallery Total After This Batch

40 designs across 9 categories: Baby Shower (21), Celebrations (4), Tropical (4), Religious (3), Islamic (2), Wedding (2), Floral (2), Birthday (1), Glamour (1).

## Steps

### 1. Copy images to project
Copy all 10 uploaded images into `public/invitation-gallery/` with clean filenames.

### 2. Insert database records
Insert 10 rows into `invitation_gallery_images` table:
- Baby Shower: sort_order 18-21
- Tropical: sort_order 2-4 (existing has 1)
- Religious: sort_order 1-3 (new category)

### Technical Details
- Files: `public/invitation-gallery/*.png` (10 new files)
- Database: 10 new rows via data insert tool
- No code changes needed -- the `useInvitationGallery` hook automatically picks up new records

