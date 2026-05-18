## Goal

Stop the Seating Chart Signs editor/preview from loading multi‑hundred‑MB master images. Use the existing small thumbnail for the live editor, and keep the original master strictly for the "Download Print‑Ready PDF" output. Scope: Seating Chart Signs only. Invitations and Name Place Cards are untouched.

## Root cause

In `SignageGalleryModal.handleSelectImage` we currently set the editor's `background_image_url` to `image.image_url` — the full master file (often 50–300 MB). The shared `InvitationCardCustomizer` + `InvitationCardPreview` then render that exact URL in the live preview, causing the laggy/"SLOW" behaviour the user reported.

The bulk uploader already writes a small JPEG to `thumbs/...` and stores it in `signage_gallery_images.thumbnail_url`. We just aren't using it for editing.

## Changes

### 1. Database — `signage_settings`

Add one nullable column to remember which master file to use at PDF time:

```text
ALTER TABLE public.signage_settings
ADD COLUMN background_image_print_url text;
```

Backfill is unnecessary (existing rows already point `background_image_url` at the master and will continue to render correctly).

### 2. `src/hooks/useSignageSettings.ts`

- Add `background_image_print_url?: string | null` to `SignageSettings`.
- Include it in `buildDefault` (null), in the SELECT mapping, and in the update payload allow‑list so `updateSettings({ background_image_print_url })` persists.

### 3. `src/components/Dashboard/Signage/SignageGalleryModal.tsx`

- Extend the prop:
  ```ts
  onSelectImage: (previewUrl: string, printUrl?: string) => void;
  ```
- In `handleSelectImage`, call:
  ```ts
  const preview = image.thumbnail_url || image.image_url;
  onSelectImage(preview, image.image_url);
  ```
  Existing callers that ignore the second arg keep working.

### 4. `src/components/Dashboard/Signage/SignagePage.tsx`

The gallery modal is wired into the shared `InvitationCardCustomizer` via `GalleryModalComponent={SignageGalleryModal}`. The shared customizer calls `onSelectImage(url)` and writes that url into `background_image_url`. To keep invitations/place‑cards untouched we don't change the shared customizer signature.

Approach: wrap `SignageGalleryModal` in a small adapter inside `SignagePage` that:
- Receives the shared `onSelectImage(previewUrl)` from the customizer.
- Intercepts the modal's 2‑arg call. When `printUrl` is provided, also call `updateSettings({ background_image_print_url: printUrl })`. When `printUrl` is absent (e.g. cleared / no gallery selection), call `updateSettings({ background_image_print_url: null })`.

Pass the adapter to the customizer as `GalleryModalComponent`.

Also, when the user removes the image or uploads a new one via "Choose File" (handled by the shared customizer), we need to clear the stale print url so the master URL never lingers. Add a tiny `useEffect` in `SignagePage` that watches `settings.background_image_url`: whenever it changes to a value that is NOT equal to the previously set preview URL from gallery selection, set `background_image_print_url = null` so PDF export falls back to `background_image_url` (which is what a Choose File upload already is — a single freshly uploaded file).

### 5. `src/components/Dashboard/Signage/SignagePage.tsx` — PDF export

In `handleDownloadPDF` only, replace:
```ts
backgroundUrl: settings.background_image_url || '',
```
with:
```ts
backgroundUrl: settings.background_image_print_url || settings.background_image_url || '',
```

`handleDownloadPNG` follows the same change so the on‑screen PNG export is also full quality.

All existing PDF dimensions, A1 max, 300 DPI logic, html2canvas pipeline, and file naming stay exactly as today.

## What is NOT changed

- No change to upload limits, no change to Supabase bucket settings or the `signage-gallery` bucket layout.
- No change to `signageUploadUtils.ts` upload pipeline. The existing `thumbs/...` JPEG (≤800px longest edge, ~50–200 KB) is reused as the preview source.
- No change to Invitations gallery, Place Cards gallery, or the shared `InvitationCardCustomizer` / `InvitationCardPreview` components.
- No visual redesign of the page or modal.

## Expected result

- Selecting any image from the Seating Chart Sign Image Gallery now loads the ~100 KB `thumbs/...` JPEG into the editor — preview is instant and scrolling/editing is smooth.
- Clicking the green "Download Print‑Ready PDF" pulls the original master file from `originals/...` and produces the same A1 / 300 DPI / print‑shop‑ready output as before.
- Existing events that already have a master URL in `background_image_url` continue to export at full quality (fallback path).
