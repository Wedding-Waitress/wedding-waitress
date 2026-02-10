

# Delete 1 Image from Brown Category

Remove the "Jasmine on Wood" image from the `place_card_gallery_images` table.

| Category | Name | File | ID |
|----------|------|------|----|
| Brown | Jasmine on Wood | Wedding_Waitress_112430572_XL.jpg | 29943f29-1b87-4070-9ca0-5c956d990cc5 |

## Technical Details

One database migration with a single `DELETE FROM place_card_gallery_images WHERE id = '29943f29-1b87-4070-9ca0-5c956d990cc5';` statement. No other files or features are modified.

