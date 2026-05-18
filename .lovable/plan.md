# Fix: Signage Gallery Image Preview After Upload

## Root cause

In `src/components/Dashboard/Signage/signageUploadUtils.ts`, when a file is larger than **40 MB**, the client-side canvas thumbnail is skipped and `thumbnail_url` is set to Supabase's **on-the-fly image transformation URL** of the 104 MB master.

Supabase image transformations refuse very large source images and return a broken image. Because both the gallery card and the detail preview render `thumbnail_url || image_url` (thumbnail first), the preview appears broken even though the upload succeeded and the bucket is public.

Confirmed:
- `signage-gallery` bucket is **public**, `file_size_limit = 500 MB` — OK.
- Global storage limit raised to 1 GB (per your screenshot) — OK.
- Master file uploads successfully; only the **preview URL** is broken.

## Fix (Signage only — Invitations & Place Cards untouched)

### 1. `src/components/Dashboard/Signage/signageUploadUtils.ts`
- Remove the 40 MB guard on `createThumbnailBlob`. The canvas downsizes the bitmap to 800px on the longest edge **before** JPEG encoding, so memory stays bounded even for 100 MB+ source files.
- If `createThumbnailBlob` returns `null` (decode failure), fall back to the **plain public URL of the master** (no `?transform=`), so the gallery still shows the real image instead of a broken transform URL.
- Never write a `getTransformedPublicUrl(...)` value into `thumbnail_url` for the master — transforms can fail silently on large originals.

### 2. `src/components/Dashboard/Signage/SignageGalleryModal.tsx`
- **Detail preview (`previewImage` view)**: render `previewImage.image_url` (full original) directly. The detail view should always show the full image, not the 800px thumbnail.
- **Gallery card grid**: keep `thumbnail_url || image_url`, but add an `onError` handler on the `<img>` that swaps to `image_url` if the thumbnail 404s — so any pre-existing broken rows self-heal on view.

### 3. No other changes
- No upload-limit changes.
- No changes to Invitations or Name Place Cards.
- No modal redesign.
- No changes to bucket settings or RLS.

## Expected result
After uploading a Seating Chart Sign image (any size up to 500 MB):
- Gallery card shows the actual thumbnail.
- Clicking the card opens the detail view showing the actual full image.
- Existing broken rows recover automatically because of the `onError` fallback.
