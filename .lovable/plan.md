# Fix Seating Chart Signs editor lag

## Root cause

The live editor + preview on the Signage page render `settings.background_image_url` directly. When a large file is selected (especially via **Choose File**, which uploads the full-resolution master straight to storage), every keystroke / drag / re-render makes the browser keep decoding a multi-megapixel image, causing the lag visible in the screenshot.

The earlier fix only swapped the gallery selection to use `thumbnail_url`. Choose File still feeds the master URL into the editor, and the `<InvitationCardPreview>` had no rendering optimisation, so the page stays heavy.

## Plan (Signage page only — no changes to Invitations, Name Place Cards, upload logic, PDF quality, or layout)

### 1. New helper: `usePreviewBackgroundUrl` (Signage-scoped)

File: `src/components/Dashboard/Signage/usePreviewBackgroundUrl.ts` (new).

- Input: `masterUrl: string | null`.
- Loads the source via `new Image()` with `crossOrigin="anonymous"`, draws to an offscreen `<canvas>` resized so the longest edge is **≤ 1200 px**, exports a JPEG blob (`quality 0.82`) and returns an `URL.createObjectURL(blob)`.
- Memoises by `masterUrl`; revokes the previous object URL on change/unmount.
- If the source is already small (natural longest edge ≤ 1200 px) or CORS fails, returns the original URL — never blocks rendering.
- Returns `{ previewUrl, ready }`. While `ready === false`, fall back to `masterUrl` so the preview is never blank.

### 2. Wire the lightweight URL into the editor in `SignagePage.tsx`

- Call `usePreviewBackgroundUrl(settings.background_image_url)` once.
- Build a single memoised `editorSettings = useMemo(() => ({ ...asInvitationSettings, background_image_url: previewUrl }), [asInvitationSettings, previewUrl])`.
- Pass `editorSettings` to **both** `<InvitationCardCustomizer>` and `<InvitationCardPreview>`. The thumbnail inside the customizer and the right-side live preview will now load only the downscaled image.
- In the customizer's `onSettingsChange` mapper, if `background_image_url` is present in the incoming change, write the value as-is (it's the real master URL from upload or gallery, never the blob URL — the customizer only sets it from upload/gallery callbacks, not from the rendered img element).

### 3. Keep PDF export at full quality (no change to behaviour)

`handleDownloadPDF` / `handleDownloadPNG` already use:

```
backgroundUrl: settings.background_image_print_url || settings.background_image_url
```

Both fields still hold the original master URL (DB is untouched), so print exports remain 300 DPI with the original file. No change needed here.

### 4. Reduce unnecessary re-renders

- Memoise `editorSettings` and `eventData` (already memoised) so identity is stable when unrelated state changes.
- Wrap the preview block in a small memoised component `SignageLivePreview = React.memo(...)` (local to `SignagePage.tsx`) that receives `editorSettings`, `eventData`, `selectedZoneId`, `qrDataUrl`, and the stable `onZoneUpdate` / `onSelectZone` callbacks (wrap callbacks in `useCallback`). This stops the preview from re-rendering on changes that don't affect its inputs (e.g. exporter state).
- Add `loading="lazy"` and `decoding="async"` cannot be applied to a CSS `background-image`, so instead we rely on the downscaled blob URL — once cached, repaints are cheap.

### 5. Cleanup

- Revoke the previous blob URL whenever `masterUrl` changes or the component unmounts to avoid memory leaks.
- No DB migration. No edge function change. No upload code change. `signageUploadUtils.ts`, `SignageGalleryModal.tsx`, `optimize-signage-image` are untouched.

## Files touched

- `src/components/Dashboard/Signage/usePreviewBackgroundUrl.ts` — **new**, downscale hook.
- `src/components/Dashboard/Signage/SignagePage.tsx` — wire the hook, memoise editor settings + preview block.

## Out of scope (explicitly not changed)

- Invitations page and components.
- Name Place Cards page and components.
- Upload flow / storage buckets / signed URLs.
- PDF export rendering or DPI.
- Page layout, styling, or copy.
