## Goal
Wipe both image galleries — Seating Chart Signs (215 images) and Invitations & Cards (415 images) — from BOTH the database tables AND the Supabase Storage buckets, leaving zero orphan files. Then confirm both galleries are 100% clean and ready for fresh uploads.

## Current state (just verified)
- `signage_gallery_images`: **215 rows**
- `invitation_gallery_images`: **415 rows**
- Storage buckets in use: `signage-gallery` and `invitation-gallery`
- An existing edge function `purge-invitation-gallery` already does a full bucket-walk + row delete for the invitation side. No equivalent exists yet for signage.

## Plan

### 1. Add a matching purge edge function for signage
Create `supabase/functions/purge-signage-gallery/index.ts` — clone of `purge-invitation-gallery` but pointed at:
- bucket: `signage-gallery`
- table: `signage_gallery_images`
- also clears the join table `signage_image_categories` first (FK)

Same admin gate (verifies caller has `admin` role via `user_roles`) so it can't be triggered by random users.

### 2. Run both purge functions
Invoke (admin-authenticated):
- `purge-signage-gallery` → wipes every object under `signage-gallery/` recursively, then deletes all rows.
- `purge-invitation-gallery` → already exists, wipes `invitation-gallery/` + rows.

Each returns `{ files_removed, rows_deleted }` so we get exact counts.

### 3. Verify clean state (read-only checks)
After running, confirm:
- `SELECT count(*) FROM signage_gallery_images` → 0
- `SELECT count(*) FROM invitation_gallery_images` → 0
- `SELECT count(*) FROM signage_image_categories` → 0
- Storage list of `signage-gallery` root → empty
- Storage list of `invitation-gallery` root → empty

Report back the exact numbers (files removed + rows deleted per bucket) so you can see nothing was left behind in Supabase Storage billing.

### 4. Confirm "ready to upload"
Both galleries already have the **80 MB** upload limit (set last turn). Nothing else to change. You can immediately start uploading the new Topaz Gigapixel JPGs to either gallery.

## What this will NOT touch
- Place Cards gallery (`placecard-gallery`) — you didn't ask, leaving as-is.
- Any event data, guests, tables, settings.
- Upload limits or UI — already at 80 MB on both.

## Notes
- Action is **irreversible** — once approved I run it and the 215 + 415 designs are gone forever from both DB and storage.
- The purge runs server-side as service role, so RLS won't block it and there will be no orphan files left racking up storage cost.