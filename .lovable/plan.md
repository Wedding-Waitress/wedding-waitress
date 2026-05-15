## Goal

Bring the Name Place Cards image gallery to feature parity with the Seating Chart Signs and Invitations & Cards galleries. Nothing changes anywhere else in the app. The current `PlaceCardGalleryModal.tsx` (176 lines, basic search + tab + grid) gets rebuilt to match `InvitationGalleryModal.tsx` (553 lines, full admin tooling).

## What was added to Signage + Invitations galleries (recap)

Listed so we can replicate the exact same set in Place Cards:

1. **Admin-only top-right "Admin Upload" button** — gated by `useIsAdmin()`. Hidden for normal users (bride/groom/vendors). Toggles an inline upload panel.
2. **Bulk Upload mode** with a dedicated `*BulkUploader` component:
   - Drag & drop or click-to-select multiple PNG/JPG files
   - Per-file progress, success/error state, retry
   - Auto-refresh of the gallery on completion
3. **Single Upload mode** — pick one file, optimize & upload button.
4. **80 MB upload cap** (`MAX_*_UPLOAD_BYTES = 80 * 1024 * 1024`) shared with the signage limit, validated client-side and surfaced in the drop-zone label.
5. **Master + thumbnail pipeline** (`uploadXxxGalleryImage`):
   - Master kept full-resolution in storage under `originals/...`
   - 800px-longest-edge JPEG thumbnail under `thumbs/...` (quality 0.75)
   - Toast reports master KB + thumb KB after upload
   - Filename auto-prettifier (`prettifyXxxFilename`)
6. **Smart category dropdown in the header** (replacing the old tab strip), showing `Category (count)` per category and `All Categories (total)`. Hidden when there’s ≤1 category.
7. **Per-image admin actions on hover** (in addition to View/Select):
   - **Delete** — removes the DB row AND both storage files (master + thumb), with a confirmation dialog.
   - **Categorize** — popover that lists existing categories with counts, lets admin assign or create a new category. Single-category enforcement.
8. **Many-to-many category model** via `*_categories` + `*_image_categories` join tables, with the legacy `category` text column kept in sync.
9. **(Invitations only) AI auto-categorization** through the `classify-invitation-image` edge function — best-effort, never blocks upload. *(We will NOT add this to Place Cards in this round — see "Out of scope".)*
10. **Lazy-loaded thumbnails** (`loading="lazy"`, `image.thumbnail_url || image.image_url`) for fast grid rendering.
11. **Mobile polish**: sticky bottom Cancel bar, wrap-friendly header, full-width category select, `lv-premium-shade` on every button.
12. **Realtime/refetch** after upload, delete, or category change so the grid updates instantly.

## Plan for Name Place Cards gallery

Scope: only `place-cards` tab. No changes to Signage, Invitations, or any other module.

### 1. Database (migration)

Mirror the invitation category model for place cards:

- Add `thumbnail_url text` to `place_card_gallery_images` (if not present).
- New table `place_card_categories` (`id`, `name unique`, `slug`, `created_at`).
- New join table `place_card_image_categories` (`image_id`, `category_id`, PK on pair).
- RLS: read = public (gallery is public-read like the others); write = admin only via existing `is_admin()` / `has_role` helper, mirroring `invitation_categories` policies.
- Backfill: insert distinct existing `place_card_gallery_images.category` values into `place_card_categories` and seed the join table so nothing disappears.

### 2. Storage

- Confirm/create a `place-card-gallery` bucket (public-read), matching the `invitation-gallery` bucket setup.
- Folders used by uploads: `originals/...` and `thumbs/...`.

### 3. Frontend files to add

- `src/components/Dashboard/PlaceCards/placeCardUploadUtils.ts` — port of `invitationUploadUtils.ts`:
  - `MAX_PLACE_CARD_UPLOAD_BYTES = 80 MB`
  - `prettifyPlaceCardFilename`
  - `uploadPlaceCardGalleryImage(file, name, category)` → master + thumbnail upload, insert row, set category via join table.
  - `assignCategoriesToImage` / `replaceImageCategories` (single-category enforcement, legacy column kept in sync).
- `src/components/Dashboard/PlaceCards/PlaceCardBulkUploader.tsx` — port of `InvitationBulkUploader.tsx` with the place-card upload util.

### 4. Frontend files to update

- `src/hooks/usePlaceCardGallery.ts`: add `thumbnail_url`, `categories: string[]`, `categoriesWithCounts`, `removeImageFromGallery`, fetch with the join (`place_card_image_categories(place_card_categories(name))`), same recompute logic as `useInvitationGallery`.
- `src/components/Dashboard/PlaceCards/PlaceCardGalleryModal.tsx`: rewrite to mirror `InvitationGalleryModal.tsx` 1:1 — header category dropdown, admin upload panel (Bulk/Single), grid with hover View/Select + admin Delete + admin Categorize popover, delete confirmation, mobile sticky Cancel, `lv-premium-shade` buttons. Keep the existing `aspect-[7/5]` tile ratio (place cards are landscape, invitations are portrait — the only intentional visual difference).

### 5. Out of scope (explicitly NOT changing)

- AI auto-classifier edge function — Place Cards stays manual-categorization only.
- Any change to Signage or Invitations galleries.
- The Place Cards customizer, exporter, preview, settings, or DPI logic (locked).
- Public/landing pages, dashboard shell, sidebar styling.

## Technical notes

- Bucket name and table prefix differ (`place-card-gallery`, `place_card_*`) — everything else is a structural copy.
- Single-category enforcement matches Invitations (assign wipes prior rows, inserts at most one, syncs the legacy text column so the image instantly disappears from its old category in the dropdown).
- Admin gating uses the existing `useIsAdmin()` hook — same surface as the other two galleries, so the bride/groom view stays identical to today (just nicer category dropdown + lazy thumbnails when those load).
- Runtime: existing `place_card_gallery_images` rows keep working — `thumbnail_url` is nullable and the grid falls back to `image_url` when null.
