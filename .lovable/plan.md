## Fix: Route preview URLs through Supabase Image Transformations

**Problem:** `transformedUrl()` in `src/lib/imagePipeline.ts` appends `?width=…&quality=…` to the `/storage/v1/object/public/…` URL. Supabase Storage **ignores** transform params on the `/object/` endpoint — it only resizes when the path is `/storage/v1/render/image/public/…`. Result: the editor preview was downloading the full 102 MB master.

### Change

In `src/lib/imagePipeline.ts`, update `transformedUrl()` so that whenever transform params are applied to a Supabase storage URL, the path is rewritten from `/storage/v1/object/public/` (or `/object/sign/`) to `/storage/v1/render/image/public/` (or `/render/image/sign/`).

Also lower preview defaults from 2400/q90 → **1400 / q70** so the editor loads a few hundred KB instead of multiple MB.

```ts
const PREVIEW_WIDTH_PX = 1400;
const PREVIEW_QUALITY = 70;

export function transformedUrl(url, opts = {}) {
  if (!url) return null;
  if (!isSupabaseStorageUrl(url)) return url;
  try {
    const u = new URL(url);
    const hasTransform = opts.width || opts.quality || opts.format;
    if (hasTransform) {
      u.pathname = u.pathname
        .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
        .replace('/storage/v1/object/sign/',   '/storage/v1/render/image/sign/');
      if (opts.width)   u.searchParams.set('width',   String(opts.width));
      if (opts.quality) u.searchParams.set('quality', String(opts.quality));
      if (opts.format)  u.searchParams.set('format',  opts.format);
    }
    return u.toString();
  } catch {
    return url;
  }
}
```

### Why it's safe

- `previewUrlFor()` / `thumbnailUrlFor()` go through `transformedUrl()` → both automatically use the render endpoint.
- `useOptimizedPreview` already HEAD-probes the candidate; if Image Transformations are disabled on the project, it falls back to the master.
- Thumbnails (Signage gallery, place-card gallery, etc.) keep working — only the URL path changes; query params stay the same.
- Master/print URLs are untouched (no transform opts passed).
- The Print export still uses `editorMasterUrl` (the unaltered original), so 300 DPI print quality is unaffected.

### Verification

After the change, the HEAD response for the editor preview URL on the Signage page should return a small `content-length` (a few hundred KB) instead of ~102 MB, and the existing `Editor preview image size: …` console log will confirm it.

### Files touched

- `src/lib/imagePipeline.ts` (only)

No DB or edge-function changes needed.