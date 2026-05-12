## Goal

Make the **Invitations & Cards → Image Gallery** behave exactly like the **Seating Chart Signs → Image Gallery**: same admin-only Bulk/Single Upload tools, same admin-only delete-on-hover with "cannot be undone" confirmation modal, same scrollbar, same category tabs hidden for admin. Only you (`naderelalfy1977@gmail.com`, with `admin` role) will see the upload + delete controls.

## Backend changes

1. **Add columns to `invitation_gallery_images`**
   - `thumbnail_url text` (nullable) — for the optimized 800px thumbnail
   - (`sort_order` already exists)

2. **Create storage bucket `invitation-gallery`** (public read), with admin-only insert/update/delete RLS policies (mirror `signage-gallery`).

3. **New edge function `optimize-invitation-image`**
   - Exact copy of `optimize-signage-image`, but writes to `invitation-gallery` bucket and inserts into `invitation_gallery_images`.
   - Same admin gate: requires `user_roles` row with `role='admin'`.
   - Same flow: master JPG (q92) → `originals/`, thumbnail 800px JPG (q75) → `thumbs/`.

4. **RLS for `invitation_gallery_images`**
   - Public SELECT (already public-readable).
   - Admin-only INSERT/UPDATE/DELETE via `has_role(auth.uid(),'admin')`.

## Frontend changes

5. **`src/hooks/useInvitationGallery.ts`**
   - Add `thumbnail_url` to interface.
   - Add `removeImageFromGallery(id)` and `refetch()` (mirror `useSignageGallery`).

6. **New `src/components/Dashboard/Invitations/invitationUploadUtils.ts`**
   - Mirror of `signageUploadUtils.ts` but invokes `optimize-invitation-image` and uploads to `invitation-gallery` bucket.

7. **New `src/components/Dashboard/Invitations/InvitationBulkUploader.tsx`**
   - Mirror of `SignageBulkUploader.tsx`, using the invitation upload utils.

8. **`src/components/Dashboard/Invitations/InvitationGalleryModal.tsx`** — full rewrite to mirror `SignageGalleryModal.tsx`:
   - "Admin Upload" button in header (visible only when `useIsAdmin().isAdmin === true`).
   - Bulk Upload + Single Upload modes with drag-and-drop, same UI as Signage.
   - Hide search bar + category tabs when admin (same as Signage).
   - Replace `ScrollArea` with the same native `overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable]` container Signage uses → restores the visible scrollbar.
   - Add admin-only Delete button on hover with the same in-modal confirmation overlay ("Cannot be undone" → Cancel / Delete), reusing the working pattern from Signage (no problematic event-stop handlers).
   - Use `image.thumbnail_url || image.image_url` for grid thumbnails for fast loading.
   - Apply `lv-premium-shade` to all new buttons (per project rule).

## Out of scope

- No changes to the public/non-admin gallery experience beyond using thumbnails when available.
- No changes to Signage gallery.
- No category list changes — uses the same fixed list as Signage uploader.

## Technical notes

- Admin gating: frontend uses `useIsAdmin` (checks `user_roles.role='admin'`); backend edge function re-validates the same. Your account has both the email match and the admin role, so you're the only one who sees/uses these controls.
- The edge function deploys automatically.
- The `invitation_gallery_images` schema only adds one nullable column, so existing 416 designs continue to work (they'll fall back to `image_url` until they're re-optimized).
