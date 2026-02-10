

# Delete 10 Lost Images + Fix 2 Duplicates

## What happened

- The last migration successfully fixed 15 images using IDs from one set of records
- However, **2 images** (Jasmine on White Timber, White Jasmine Border) have **duplicate database records** — one was fixed, one still points to the dead bucket
- The remaining **10 images** are genuinely lost (no local file exists) and need to be deleted

## The Fix (single migration)

**Part 1 — Fix 2 duplicate White images** by updating their bucket URL to local path:

| Name | ID | Local File |
|------|----|------------|
| Jasmine on White Timber | 1ac72cec-... | /gallery-images/Wedding_Waitress_599699858_XL.jpg |
| White Jasmine Border | 3e5c02d9-... | /gallery-images/Wedding_Waitress_639146570_XL.jpg |

**Part 2 — Delete 10 lost images** (no local file, bucket is 404):

| Name | Category | ID |
|------|----------|----|
| White Blossoms on Turquoise | Blue | 2452f501-... |
| Eucalyptus on Blush | Green | f0701d8b-... |
| Eucalyptus on Lavender | Green | 5e3b4c57-... |
| Pink Carnations on Timber | Pink | 171805f0-... |
| Pink Peonies on Timber | Pink | b96ecd66-... |
| Pink Tulips on Timber | Pink | f0810c43-... |
| Pink Tulips Side | Pink | 956d21ec-... |
| Red and Yellow Tulips | Rainbow | 6a54a760-... |
| Spring Tulip Bouquet | Rainbow | 7a89fd9d-... |
| Red Roses on Timber | Red | c068fa37-... |

## Why the images were lost

You're right — those 10 images were uploaded to the Supabase storage bucket with custom descriptive filenames (e.g., `Pink_Carnations_on_Timber.jpg`) rather than their original camera/stock filenames. When the bucket was cleared, there was no matching local file to fall back on. The Group A images survived because their original filenames (like `Wedding_Waitress_XXX.jpg`) matched files already sitting in `public/gallery-images/`.

## Technical Details

Single migration with 2 UPDATEs and 1 DELETE:

```sql
-- Fix 2 duplicate White records
UPDATE place_card_gallery_images
SET image_url = '/gallery-images/Wedding_Waitress_599699858_XL.jpg'
WHERE id = '1ac72cec-80fc-4d8f-88c8-334b26270ac2';

UPDATE place_card_gallery_images
SET image_url = '/gallery-images/Wedding_Waitress_639146570_XL.jpg'
WHERE id = '3e5c02d9-a62f-4bb8-a3db-c0b9b8a11e44';

-- Delete 10 lost images
DELETE FROM place_card_gallery_images
WHERE id IN (
  '2452f501-ae12-4204-b4d3-6c52ab9d86f7',
  'f0701d8b-e4a5-43fe-9fab-901f484e1472',
  '5e3b4c57-8d4e-40b0-894e-41934fe63c5a',
  '171805f0-29a0-4fd5-9954-9ccc8795cf57',
  'b96ecd66-78e7-4efb-96f9-7d856d0599f0',
  'f0810c43-2a45-4eb1-9416-3fb59d305e11',
  '956d21ec-babd-466d-8d68-7d2ff1bd70a9',
  '6a54a760-0dee-4775-93e4-7395eaad10e6',
  '7a89fd9d-a71f-4c73-b526-b201557cd5bf',
  'c068fa37-167f-4334-972c-982bc102d240'
);
```

No code files are modified.

