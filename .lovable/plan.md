## Root cause

Both galleries store category two ways:

1. New: `invitation_image_categories` / `signage_image_categories` join tables (1 row per image — already de-duplicated).
2. Legacy: a `category` TEXT column directly on `invitation_gallery_images` / `signage_gallery_images`.

`useInvitationGallery` and `useSignageGallery` merge BOTH sources:

```ts
const fallback = typeof row.category === 'string' && row.category.length > 0 ? [row.category] : [];
const merged = Array.from(new Set([...cats, ...fallback]));
```

When an admin reassigns an image, `replaceImageCategories` correctly rewrites the join-table row, but the legacy `category` column on the gallery image is never touched. Result: the image keeps appearing under its previous category (and never disappears from "Uncategorized" if it was uncategorised before).

## Fix

### 1. Sync the legacy `category` column on every assignment
File: `src/components/Dashboard/Invitations/invitationUploadUtils.ts`

In `assignCategoriesToImage`, after the join-table insert, also:

```ts
await supabase
  .from('invitation_gallery_images' as any)
  .update({ category: name })
  .eq('id', imageId);
```

In `replaceImageCategories`, when called with an empty array, also clear the legacy column to `'Uncategorized'`.

Mirror the exact same change in `src/components/Dashboard/Signage/signageUploadUtils.ts`.

### 2. Make the hooks trust the join table as the single source of truth
Files: `src/hooks/useInvitationGallery.ts`, `src/hooks/useSignageGallery.ts`

Replace the `merged` logic with: if join-table category exists, use ONLY that; only fall back to `row.category` when the join table has no row for this image (legacy data). This guarantees old categories disappear instantly even if a sync ever lags.

### 3. Backfill once via migration
Run a one-time migration that:
- Sets `invitation_gallery_images.category` = the joined `invitation_categories.name` (or `'Uncategorized'` if no join row).
- Same for `signage_gallery_images`.

### 4. Enforce single-category at DB level (idempotent)
Add a UNIQUE constraint on `image_id` to both join tables:

```sql
ALTER TABLE invitation_image_categories
  ADD CONSTRAINT invitation_image_categories_image_id_unique UNIQUE (image_id);
ALTER TABLE signage_image_categories
  ADD CONSTRAINT signage_image_categories_image_id_unique UNIQUE (image_id);
```

This makes any future duplicate insert impossible at the database level.

### 5. Verify
- Open the admin gallery, reassign an image from "Floral" to "Wedding": image must vanish from Floral and appear in Wedding immediately (existing modal already calls `refetch()` after `replaceImageCategories`).
- Reassign an "Uncategorized" image: must vanish from Uncategorized.
- No design / upload / filter / admin UI changes.

## Out of scope
- No UI redesign.
- No changes to upload, search, or filter behaviour.
- No changes to existing categories or image assets.
