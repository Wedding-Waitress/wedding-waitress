## Goal

Bring the Seating Chart Sign Image Gallery (`SignageGalleryModal`) to strict feature parity with the Invitation Image Gallery (`InvitationGalleryModal`), reusing the same many-to-many category architecture. Only the heading text differs ("Seating Chart Sign Image Gallery"). No other page/feature changes.

## Scope of changes (Signage gallery only)

### 1. Database — new tables (mirror invitation tables)

Create:

- `signage_categories` — `id`, `name` unique, `slug`, `created_at`
- `signage_image_categories` — junction `(image_id → signage_gallery_images.id, category_id → signage_categories.id)`, `created_at`

RLS (mirror invitation policies):

- Anyone can `SELECT` both tables
- Only admins (`has_role(auth.uid(),'admin')`) can `INSERT/UPDATE/DELETE`

Seed `signage_categories` with the distinct `category` values currently present in `signage_gallery_images`, and backfill `signage_image_categories` so every existing image gets its current single category as a row. Existing `signage_gallery_images.category` text column stays as a fallback (same pattern as invitations).

### 2. Hook — `src/hooks/useSignageGallery.ts`

Mirror `useInvitationGallery`:

- Add `categories: string[]` from join + `categoriesWithCounts: { name, count }[]`
- Each image gets `categories: string[]` derived from join (fallback to `category` text if join empty)
- `recompute()` rebuilds counts + names from images
- `removeImageFromGallery` calls `recompute`
- Select with `*, signage_image_categories(signage_categories(name))`

### 3. Utils — `src/components/Dashboard/Signage/signageUploadUtils.ts`

Add (mirror invitation utils):

- `assignCategoriesToImage(imageId, names)` — single-category enforcement: upsert into `signage_categories`, wipe `signage_image_categories` for that image, insert one row
- `replaceImageCategories(imageId, names)` — same delete-then-assign pattern
- After successful `insert` into `signage_gallery_images`, return the new id and call `replaceImageCategories(id, [adminCategory || 'Uncategorized'])`. No AI auto-classification (signage gallery has no equivalent classifier and user requested no extra logic).

### 4. UI — `src/components/Dashboard/Signage/SignageGalleryModal.tsx`

Mirror `InvitationGalleryModal` exactly, scoped to signage data:

- Switch from `Tabs` category bar to the same `Select` dropdown header (with `categoriesWithCounts`, count badges, "All Categories (N)") shown only when more than one category exists
- Replace `categories: string[]` filter with `image.categories.includes(effectiveCategory)`
- Add admin-only "Categorize" hover button (Tag icon) on every card with the same Popover containing:
  - Scrollable list of existing `categoriesWithCounts` (selecting calls `replaceImageCategories(image.id, [name])` → toast → refetch; current category disabled)
  - "+ Create New Category" toggle to a small input + Save row → upserts category and assigns
- New state: `categorizeOpenId`, `categorizeMode`, `newCategoryName`, `assigningCategory` and `handleAssignCategory` helper
- Heading text remains: **"Seating Chart Sign Image Gallery"**
- Keep all existing signage behaviors: admin upload (single + bulk), drag/drop, delete confirm modal, preview, search, hover overlay (View / Select / Delete), mobile sticky cancel — only the bits above are added/swapped to match invitations.

### 5. Out of scope (untouched)

- `SignagePage.tsx`, `SignageCustomizer.tsx`, canvas/editor, QR generation, sign export
- `SignageBulkUploader.tsx` internals (kept; bulk upload will simply assign the admin-picked category via the updated `uploadSignageGalleryImage` flow already used per file)
- All other pages/features in the app

## Files

- New migration: `signage_categories`, `signage_image_categories`, RLS, backfill from existing `signage_gallery_images.category`
- Edit: `src/hooks/useSignageGallery.ts`
- Edit: `src/components/Dashboard/Signage/signageUploadUtils.ts`
- Edit: `src/components/Dashboard/Signage/SignageGalleryModal.tsx`

## Acceptance

- Header reads "Seating Chart Sign Image Gallery"
- Category dropdown with counts appears (identical layout to invitations) when 2+ categories exist
- Admin sees Admin Upload button, Categorize popover on every card, Delete button — non-admin sees only View/Select + search
- Selecting / creating a category instantly updates the dropdown counts and filter (single category per image, prior assignments wiped)
- Existing signage images keep their current category after backfill