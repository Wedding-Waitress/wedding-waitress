

# Remove 12 Duplicate Images from Gallery

Delete these 12 duplicate records from the `place_card_gallery_images` table via a single database migration:

| Category | Name | File |
|----------|------|------|
| Blue | Light Blue Wood | Blue_9.jpg |
| Brown | Autumn Leaves Top Border | White_with_Autumn_Leaves-2.jpg |
| Orange | Orange Abstract | Orange_Abstract.jpg |
| Pink | Pink Watercolor Flowers | Pink_Watercolor_Flowers.jpg |
| Pink | Pastel Pink Flowers | Pastel_Pink_Flowers.jpg |
| Purple | Purple Textured | Purple_Textured.jpg |
| Purple | Purple Silk | Purple_Silk.jpg |
| Red | Dark Red | Red_6.jpg |
| Red | Red Tulips on Timber | Wedding_Waitress_108648998_XL.jpg |
| Red | Red Roses Bouquet | Red_Roses_Bouquet.jpg |
| White | Autumn Leaves Top | White_with_Autumn_Leaves.jpg |
| White | Jasmine on White Timber | Wedding_Waitress_599699858_XL.jpg |

## Technical Details

One SQL migration file with a single `DELETE ... WHERE id IN (...)` statement targeting all 12 IDs. No other files or features are modified.

