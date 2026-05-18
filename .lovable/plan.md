## What's actually breaking

The Signage upload code is already a near-perfect clone of the working Place Cards gallery (same util shape, same modal/bulk-uploader pattern). The console proves the real failure is **server-side**, not client-side:

```
StorageApiError: The object exceeded the maximum allowed size
status 400 / statusCode 413
```

Supabase storage is rejecting the file before our code can do anything. I checked all three buckets — none of them have a `file_size_limit` set, which means they're falling back to the project-wide Storage default (~50 MB on the standard plan). Your true A0 / Topaz 6× JPGs (100–250 MB) blow past that, so:

- Single upload "hangs" → it's actually rejected with 413; toast disappears too fast.
- Bulk of 5 → all 5 hit 413 in parallel, modal shows "all failed" and the page state resets.

The Place Cards gallery only "works" for you because you've been uploading smaller files into it; if you drop a 150 MB file into it today it will fail the same way.

## Fix (one coordinated change across all 3 galleries)

### 1. Raise the bucket file size limit (DB migration)

Set `file_size_limit = 524288000` (500 MB) on:
- `signage-gallery`
- `place-card-gallery`
- `invitation-gallery`

500 MB safely covers a 6× Topaz A0 JPEG at 300 DPI with headroom.

### 2. Mirror Place Cards behaviour exactly into Signage + Invitations

Bring the three galleries to identical structure and limits (Signage is already 95% the same — only deltas listed):

| File | Change |
|---|---|
| `placeCardUploadUtils.ts` | Raise `MAX_PLACE_CARD_UPLOAD_BYTES` 80 MB → **500 MB**. Add `createPreviewThumbnail` helper (same one Signage uses) for bulk previews. |
| `invitationUploadUtils.ts` | Same: raise its `MAX_*` to **500 MB**, add `createPreviewThumbnail` helper. |
| `signageUploadUtils.ts` | Raise `MAX_SIGNAGE_UPLOAD_BYTES` 200 MB → **500 MB**, update error text. |
| `PlaceCardBulkUploader.tsx` | Mirror the Signage bulk pattern: chunked `addFiles` (3 at a time), tiny `createPreviewThumbnail` rows instead of full-image `<img>` decode, raise per-row size cap to 500 MB. |
| `InvitationBulkUploader.tsx` | Same chunked + thumbnail pattern, 500 MB cap. |
| `SignageBulkUploader.tsx` | Already chunked — just bump cap message to 500 MB. |
| `PlaceCardGalleryModal.tsx` / `InvitationGalleryModal.tsx` / `SignageGalleryModal.tsx` | Update all helper text: "Max 500 MB per upload", "For A0 signs upload JPG at 300 DPI", "≤500 MB". Add inline red warning + disable Optimize & Upload button when file is oversize (already done for Signage, mirror to the other two). |

### 3. Bulk-upload page-exit fix (Signage)

The "image gallery page just exited after the scan" is caused by every row throwing a 413 → the parent re-renders and the modal's `open` state resets. Once the bucket limit is raised the errors stop, but I'll also harden `SignageBulkUploader.tsx` so a failed batch leaves rows in `error` state and does **not** unmount the modal (mirror exactly how the Place Card bulk uploader survives partial failures).

## Out of scope

- QR codes, text zones, background settings, preview canvas, event selection.
- The "Photo & Video Sharing" module in the long instructions block — you asked only about gallery uploads.
- The A0 vs A1 wording on the Print & Export Studio cards stays as you set it last time (A1 is still the largest *printable* size shown to end users); this change only affects the **admin image gallery** capacity behind the scenes.

## Verification

1. Run migration → re-query `storage.buckets` to confirm `file_size_limit = 524288000` on all three.
2. Single upload: drop your 106 MB "Asian Wedding Bamboo Gold Elegant.jpg" into Signage gallery → expect success toast + thumbnail.
3. Bulk upload: drop 5 large files (mix sizes incl. one 150 MB+) → expect each row to progress independently, modal stays open, completed rows show green.
4. Repeat 2–3 in Place Cards and Invitations galleries with similarly large files.
5. Confirm gallery page does **not** auto-exit on failure (force one oversize file >500 MB to see graceful red error row).
