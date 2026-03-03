

# Insert Missing Batch 2 Records (9 Images)

The 9 image files from Batch 2 are already in `public/invitation-gallery/` but their database records were never inserted. This migration will add them.

## Records to Insert

| Name | Category | Sort Order |
|------|----------|------------|
| Burgundy Cream Rose Watercolor Corner | Floral | 127 |
| Peach Rose Gold Leaf Full Border | Floral | 128 |
| Dark Brown Gold Leaf Rose Frame | Glamour | 12 |
| Peach Watercolor Purple Sunflower Gold Frame | Floral | 129 |
| Cream Autumn Red Leaf Wreath Border | Floral | 130 |
| White Pink Peony Orchid Bottom Spray | Floral | 131 |
| Dusty Blue Pink Rose Watercolor Frame | Floral | 132 |
| Navy Blue Pink Floral Gold Frame | Floral | 133 |
| Slate Blue Watercolor Magnolia Frame | Floral | 134 |

## Technical Step

Create a single SQL migration to INSERT 9 rows into `invitation_gallery_images`, bringing the total from 333 to **342 designs**.

