

# Place Cards Gallery - Batch 1 Upload (10 Images)

## Image Categorization and Naming

| # | Image | Proposed Name | Category | Reason |
|---|-------|--------------|----------|--------|
| 1 | Green with gold ornate corner flourishes | Emerald Gold Ornate Corners | Green | Deep green background with gold decorative elements |
| 2 | White with soft eucalyptus branch | Eucalyptus Branch White | Green | Green botanical eucalyptus on white |
| 3 | Watercolor teal eucalyptus leaves | Watercolor Teal Eucalyptus | Green | Teal-green watercolor botanical style |
| 4 | Peach background with thin black border | Peach Classic Border | Orange | Peach/salmon tone fits the Orange category |
| 5 | White with rose-gold line-drawn flowers | Rose Gold Line Art Florals | Pink | Coral/rose-gold toned floral line art |
| 6 | Pink lace borders top and bottom | Pink Lace Double Border | Pink | Delicate pink lace pattern |
| 7 | Purple botanical leaves on white | Purple Botanical Leaves | Purple | Lilac and purple leaf sprigs |
| 8 | Light pink with soft hibiscus flowers | Pink Hibiscus Soft | Pink | Pastel pink hibiscus silhouettes |
| 9 | Bold fuchsia with hibiscus corners | Fuchsia Hibiscus Bold | Pink | Vibrant magenta/fuchsia hibiscus |
| 10 | Turquoise/aqua with hibiscus corners | Aqua Hibiscus Tropical | Blue | Aqua/turquoise hibiscus design |

All 10 images fit into existing categories -- no new categories needed.

## Technical Steps

1. Upload all 10 images to the `place-card-gallery` Supabase storage bucket via the `fix-gallery-upload` edge function
2. Insert 10 rows into the `place_card_gallery_images` table with the names, categories, and storage URLs shown above
3. Use sequential sort_order values starting after the current max sort_order in each category

## Updated Category Counts After Upload

- Green: 19 --> 22 (+3)
- Orange: 12 --> 13 (+1)
- Pink: 23 --> 27 (+4)
- Purple: 4 --> 5 (+1)
- Blue: 22 --> 23 (+1)
- **New total: 161 --> 171 Total Designs**

