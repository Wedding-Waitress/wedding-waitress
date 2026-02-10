

# Upload 10 New Place Card Gallery Images

## Overview
Upload 10 new background images to the Place Card Image Gallery, adding them to Supabase Storage (`place-card-gallery` bucket) and inserting database records into `place_card_gallery_images`.

## Image Assignments

### New Category: Christmas (3 images)
| File | Display Name | Sort Order |
|------|-------------|------------|
| Christmas_1.jpg | Christmas Tree and Ornaments | 1 |
| Christmas_2.jpg | Pine Branches and Snow | 2 |
| Christmas_3.jpg | Gifts and Candy Canes | 3 |

### New Category: Islamic (2 images)
| File | Display Name | Sort Order |
|------|-------------|------------|
| Islamic_1.jpg | Golden Lanterns | 1 |
| Islamic_2.jpg | Ornate Gold Frame | 2 |

### Existing Category: Rainbow (currently 4 images, max sort 4)
| File | Display Name | Sort Order |
|------|-------------|------------|
| Wedding_Waitress_1923247_XL.jpg | Colourful Tulips | 5 |

### Existing Category: Blue (currently 9 images, max sort 10)
| File | Display Name | Sort Order |
|------|-------------|------------|
| Wedding_Waitress_43934197_XL.jpg | Watercolor Flower Frame | 11 |
| Wedding_Waitress_46752785_XL.jpg | Pink Blossoms on Blue | 12 |

### Existing Category: Red (currently 4 images, max sort 6)
| File | Display Name | Sort Order |
|------|-------------|------------|
| Wedding_Waitress_108648998_XL.jpg | Red Tulips on Timber | 7 |

### Existing Category: Brown (currently 5 images, max sort 8)
| File | Display Name | Sort Order |
|------|-------------|------------|
| Wedding_Waitress_112430572_XL.jpg | Jasmine on Wood | 9 |

## Technical Steps

1. **Copy images to public folder** for staging:
   - Copy all 10 images from `user-uploads://` to `public/gallery-images/`

2. **Upload to Supabase Storage** via an edge function or migration:
   - Upload each file to the `place-card-gallery` bucket under organized folder paths (e.g., `christmas/Christmas_1.jpg`, `islamic/Islamic_1.jpg`, `blue/Watercolor_Flower_Frame.jpg`, etc.)

3. **Insert database records** via SQL migration:
   - Insert 10 rows into `place_card_gallery_images` with name, category, image_url (public storage URL), and sort_order

4. **No code changes needed** -- the existing `usePlaceCardGallery` hook and `PlaceCardGalleryModal` component will automatically pick up the new images

## Files Changed
| File | Change |
|------|--------|
| public/gallery-images/*.jpg | 10 new image files copied |
| SQL migration | INSERT 10 records into place_card_gallery_images |

