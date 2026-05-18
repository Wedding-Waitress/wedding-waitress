# Fix: Seating Chart Signs preview quality + Download Print-Ready PDF

Scope: `src/components/Dashboard/Signage/SignagePage.tsx` + `src/components/Dashboard/Signage/SignageGalleryModal.tsx` only. No backend, no upload-logic, no Invitations / Place Cards changes.

## Root causes

1. **Blurry preview**: `SignageGalleryModal.onSelectImage` passes `image.thumbnail_url` (≈400 px) as the "preview" arg. The Signage adapter stores that as `background_image_url`, so the editor preview source is a 400 px JPEG. `useOptimizedPreview` then asks Supabase to transform a 400 px image up to 2400 px — Supabase image transforms do not upscale, so the editor renders a stretched 400 px thumb. Pixelated.
2. **PDF button "does nothing"**: when the user adds an image via Choose File (not the gallery), `background_image_print_url` is force-nulled (SignagePage line 604–606). `handleDownloadPDF` then falls back to `background_image_url`, which can be a thumb. The export sometimes succeeds (blurry) and sometimes throws; the catch block shows a generic "Could not generate the PDF" toast that hides the real reason, so it reads as "nothing happens".

## Changes

### 1. `SignageGalleryModal.tsx` — stop sending the thumb as the editor source
- Change the click handler that fires `onSelectImage` so it passes the **master `image.image_url`** as the first argument (editor source) and the master `image.image_url` as the second argument (print URL).
- Comment updated: editor now uses the server-resized master (≈2400 px), gallery cards still render `thumbnail_url` for their own grid (unchanged).

### 2. `SignagePage.tsx` — guarantee the editor never sees a thumb, even for legacy rows
- In the `useOptimizedPreview` call, pass `settings?.background_image_print_url ?? settings?.background_image_url` as the master URL. This way, any existing row whose `background_image_url` is still a 400 px thumb is upgraded back to the master for the editor.
- Keep `background_image_preview_url` as the preferred input when present (pre-generated 2400 px variant from the edge function).
- Leaves `transformedUrl(..., { width: 2400, quality: 90 })` to do server-side downscale of the master → crisp editor preview.

### 3. `SignagePage.tsx` — make the PDF export reliable and self-diagnosing
- `handleDownloadPDF`:
  - Resolve the export background as `background_image_print_url ?? background_image_url` (already correct, kept).
  - Guard: if both URLs are missing AND no `background_color`, abort with a clear toast ("Add a background image or color before exporting").
  - In the `catch`, surface the real error: `err?.message || String(err)` shown inside the destructive toast description, plus full `console.error`. No more silent generic failure.
- The button's disabled condition already requires `settings`, `printSize`, and a background — that logic stays. Removing the silent catch is what makes the button feel "working" again when something does go wrong (e.g. CORS on a master image).

### 4. Preview rendering CSS sanity check
- Confirm `InvitationCardPreview` renders the background via a CSS `background-image` on a fixed A4 frame (`794 × 1123` portrait) inside `PinchZoomContainer`. No code change needed — once the source URL is a 2400 px master (item 2), the existing `background-size: cover` paints sharply.

## Out of scope (explicitly NOT touched)
- Upload pipeline (`uploadAndOptimize`, `optimize-image` edge function, signage bucket policy).
- Invitations and Place Cards customizers, hooks, exporters.
- Database schema and RLS.
- Locked stable pages and global UI tokens.

## Verification
1. Open Signs page → pick an event with an existing background → editor preview is sharp (network tab: image request URL includes `?width=2400&quality=90` and returns a 2400 px JPEG, not the 400 px thumb).
2. Pick a print size (e.g. A1) → "Download Print-Ready PDF" becomes enabled → click → PDF downloads using the master URL.
3. Force an export error (e.g. temporarily break the URL) → toast shows the real error message instead of failing silently.
