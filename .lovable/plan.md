## Goal
Canva-style image experience across all 3 sign studios (Seating Chart Signs, Invitations & Cards, Name Place Cards): instant load, crisp screen previews, smooth editing, high-resolution print exports.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│  UPLOAD                                                          │
│  Client → Storage (sources/) → optimize-image edge function      │
│                                  ↓ generates 3 variants          │
│                                  ├─ master.jpg  (original px)    │
│                                  ├─ preview.jpg (2400px q=0.92)  │
│                                  └─ thumb.jpg   ( 400px q=0.75)  │
│                                  ↓                               │
│                                  saves to <bucket>/optimized/    │
│                                  returns { master, preview, thumb│
│                                          width, height }         │
├──────────────────────────────────────────────────────────────────┤
│  DISPLAY                                                         │
│  Gallery cards    → thumb URL                                    │
│  Live editor      → preview URL  (fallback: client downscale)    │
│  PDF / PNG export → master URL   (untouched original quality)    │
├──────────────────────────────────────────────────────────────────┤
│  DELIVERY                                                        │
│  All URLs go through Supabase Image Transformations              │
│  (`?width=…&quality=…`) for on-the-fly resize where supported    │
└──────────────────────────────────────────────────────────────────┘
```

## Database

One migration:
- Add `background_image_preview_url` and `background_image_thumb_url` to `invitation_card_settings`, `place_card_settings`, `signage_settings` (signage already has `background_image_print_url` for master).
- Add `background_image_width_px`, `background_image_height_px` to the same 3 tables (for the auto-upscale warning).
- No RLS changes — columns inherit existing row policies.

## Edge function

New `optimize-image` (shared, replaces signage-only `optimize-signage-image`):
- Input: `{ sourcePath, bucket, ownerScope: 'user'|'admin' }`
- Auth: requires JWT; user-scoped variant verifies the source path starts with the caller's user id; admin variant requires `admin` role (used by gallery curation).
- Uses `imagescript` (Deno-native) to produce master/preview/thumb.
- Writes to `<bucket>/optimized/<userId>/<hash>-{master,preview,thumb}.jpg`.
- Returns all three public URLs + native pixel dimensions.
- The existing `optimize-signage-image` is kept as a thin alias so the admin gallery keeps working.

## Frontend

New shared module `src/lib/imagePipeline.ts`:
- `uploadAndOptimize(file, { bucket, folder })` — uploads source, invokes edge function, returns variants + dims.
- `transformedUrl(url, { width, quality })` — appends Supabase transformation params with safe fallback when URL isn't a storage URL or transformations are disabled.
- `useOptimizedPreview(masterUrl, previewUrl)` — returns the best available preview (preview > transformed master > client-downscaled master).

Hook updates:
- `useInvitationCardSettings`, `usePlaceCardSettings`, `useSignageSettings` start persisting the new `*_preview_url` / `*_thumb_url` / `*_width_px` / `*_height_px` fields.

Customizer updates (`Invitations`, `Place Cards`, `Signage`):
- Replace direct `supabase.storage.upload` calls in the "Choose File" path with `uploadAndOptimize`.
- Gallery thumbnails read `thumb_url`. Editor previews read `preview_url`. Export reads `master_url`.

Export updates (`invitationExporter.ts` + PDF flows in all 3 studios):
- Always load `master_url` (no behavioural change to the rendering engine — preserves current 300 DPI quality).
- Before triggering export, compare master pixel dimensions to the selected print size (mm × 11.811 = px @ 300 DPI). If master is < 80% of required pixels, show a non-blocking warning modal: "Your image is N×M px. For A1 at 300 DPI you need 7016×9933 px. The PDF will still export, but quality may be reduced." User can proceed or cancel.

## Locked-page impact

- `Invitations` page edits are limited to the upload/preview/export wiring inside the customizer. No layout/typography/UI changes.
- `Place Cards` same scope. The 300 DPI export math in `usePlaceCardSettings` / `placeCardsPdfExporter.ts` is NOT modified — only the source URL routed in.
- `Signage` builds on the work already shipped this session.
- No changes to homepage, sidebar, Dashboard shell, My Events, Tables, Guest List.

## Rollout

1. Migration (adds columns).
2. Edge function deploy.
3. Shared `imagePipeline.ts` + hook updates.
4. Wire Signage (lowest risk, already mid-flight).
5. Wire Invitations.
6. Wire Place Cards.
7. Auto-upscale warning across all 3.

## Out of scope (would need separate approval)

- Floor Plan, Full Seating Chart, Dietary Chart background images.
- Welcome / invite video pipelines.
- Migrating already-uploaded historical images (a one-time backfill function can be added later if needed; new uploads get the full pipeline immediately).

## Notes

- Supabase Image Transformations work on public buckets (`invitations`, `signage-gallery`). For private buckets we generate signed URLs without transforms — preview/thumb files cover that case.
- `imagescript` (Deno) is already in use by `optimize-signage-image`, so no new dependencies.