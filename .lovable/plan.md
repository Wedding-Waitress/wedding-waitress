## Goal
Decouple the Image Gallery used inside the Seating Chart Signs page from the Invitations gallery, rename it, fix the View-preview behaviour, and ship it empty so new seating-chart-sign designs can be uploaded later. No changes to Invitations & Cards or any other page.

## Changes

### 1. New dedicated gallery (separate from Invitations)
- New DB table `signage_gallery_images` (same shape as `invitation_gallery_images`: `id, name, category, image_url, sort_order, created_at`) with RLS allowing public read + admin write — mirror policies of the invitation gallery table.
- New storage bucket `signage-gallery` (public read), mirroring the invitation gallery bucket policies.
- New hook `src/hooks/useSignageGallery.ts` — clone of `useInvitationGallery` but reading from `signage_gallery_images`.
- New component `src/components/Dashboard/Signage/SignageGalleryModal.tsx` — clone of `InvitationGalleryModal` but:
  - Title: "Seating Chart Sign Image Gallery".
  - Count label uses `signage_gallery_images.length` (not invitation count).
  - Uses `useSignageGallery`.

### 2. Wire Signage page to the new gallery (without touching Invitations)
- Add an optional prop `GalleryModalComponent?` (or `gallerySource: 'invitations' | 'signage'`) to `InvitationCardCustomizer`. Default behaviour stays exactly as today (Invitations page renders the existing `InvitationGalleryModal`).
- In `SignagePage.tsx`, pass the new `SignageGalleryModal` so the Background tab → Image Gallery button opens the Seating Chart Sign gallery instead of the invitation gallery.

### 3. Fix View → preview rendering
- In the new `SignageGalleryModal`, in the preview pane replace the current `max-h-[60vh] object-contain` image with a properly sized container that explicitly sets a min-height and uses `object-contain` inside a flex parent with `flex-1 min-h-[400px]`, so the previewed design always renders before "Use this image" is clicked. (Bug repro in the existing modal: preview area can collapse to 0 height when parent is constrained.)

### 4. Empty starting state
- Migration inserts no rows. Modal shows existing empty-state ("No images available yet"). Invitation gallery rows are untouched.

## Out of scope
- Invitations & Cards page, its gallery, modal, hook, table, bucket — all unchanged.
- Designer logic, PDF export, QR generation, sidebar, other pages, other DB tables.

## Technical notes
- Migration adds: table `signage_gallery_images`, RLS policies (public SELECT, admin INSERT/UPDATE/DELETE via existing `has_role`), storage bucket `signage-gallery` + policies.
- `InvitationCardCustomizer` change is additive (new optional prop, default = current `InvitationGalleryModal`) so Invitations page renders identically.
