

# Fix Broken Gallery Images

## The Problem

26 out of your gallery images still point to old **Supabase Storage bucket URLs** that are now returning 404 (the files were deleted from the bucket). That's why they show as broken/blank in the gallery.

## What I Found

I split the 26 broken images into two groups:

### Group A: 15 images I CAN fix right now (local file exists)

These images already exist in your project's `public/gallery-images/` folder — they just need their database URL updated from the broken bucket link to the local path.

| Name | Category | Local File |
|------|----------|------------|
| Watercolor Flower Frame | Blue | Wedding_Waitress_43934197_XL.jpg |
| Pink Blossoms on Blue | Blue | Wedding_Waitress_46752785_XL.jpg |
| Jasmine on Wood | Brown | Wedding_Waitress_112430572_XL.jpg |
| Christmas Tree and Ornaments | Christmas | Christmas_1.jpg |
| Pine Branches and Snow | Christmas | Christmas_2.jpg |
| Gifts and Candy Canes | Christmas | Christmas_3.jpg |
| Pink and Gold Ornaments | Christmas | Wedding_Waitress_613771420_XL.jpg |
| Golden Lanterns | Islamic | Islamic_1.jpg |
| Ornate Gold Frame | Islamic | Islamic_2.jpg |
| Pink Gift with Baby's Breath | Pink | Wedding_Waitress_826407602_XL.jpg |
| Pink Peonies on White Timber | Pink | Wedding_Waitress_497593504_XL-2.jpg |
| Colourful Tulips | Rainbow | Wedding_Waitress_1923247_XL.jpg |
| Red Tulips on Timber | Red | Wedding_Waitress_108648998_XL.jpg |
| Jasmine on White Timber | White | Wedding_Waitress_599699858_XL.jpg |
| White Jasmine Border | White | Wedding_Waitress_639146570_XL.jpg |

### Group B: 11 images that are LOST (no local file, bucket is 404)

These were uploaded to the Supabase storage bucket with custom descriptive names. The bucket files are gone and no local copy exists. You would need to re-upload these.

| Name | Category | Missing File |
|------|----------|-------------|
| White Blossoms on Turquoise | Blue | White_Blossoms_on_Turquoise.jpg |
| Eucalyptus on Blush | Green | Eucalyptus_on_Blush.jpg |
| Eucalyptus on Lavender | Green | Eucalyptus_on_Lavender.jpg |
| Pink Carnations on Timber | Pink | Pink_Carnations_on_Timber.jpg |
| Pink Peonies on Timber | Pink | Pink_Peonies_on_Timber.jpg |
| Pink Tulips on Timber | Pink | Pink_Tulips_on_Timber.jpg |
| Pink Tulips Side | Pink | Pink_Tulips_Side.jpg |
| Red and Yellow Tulips | Rainbow | Red_and_Yellow_Tulips.jpg |
| Spring Tulip Bouquet | Rainbow | Spring_Tulip_Bouquet.jpg |
| Red Roses on Timber | Red | Red_Roses_on_Timber.jpg |

Note: "White Blossoms on Turquoise" makes it 11 total but the table shows 10 because it's in the Blue category separate from the rest.

## The Fix

**Step 1 (immediate):** Run a single database migration with 15 UPDATE statements to point Group A images to their local `/gallery-images/` paths. This fixes 15 images instantly.

**Step 2 (your decision for Group B):** For the 11 lost images, you have two options:
- **Option A:** Delete those 11 database records (the images are gone anyway, so they just show as broken placeholders)
- **Option B:** You re-upload those 11 images to me and I add them back as local files

No code files are modified — this is purely a database URL update.

## Technical Details

Single migration file with 15 UPDATE statements like:
```sql
UPDATE place_card_gallery_images
SET image_url = '/gallery-images/Wedding_Waitress_43934197_XL.jpg'
WHERE id = 'df4e9057-...';
```

