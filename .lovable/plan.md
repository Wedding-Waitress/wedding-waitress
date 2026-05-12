## Invitation Gallery — Manual Admin Categorize Control

Replace the AI batch reclassify flow with a per-image, admin-only manual categorize control.

### 1. Remove AI Reclassify
In `src/components/Dashboard/Invitations/InvitationGalleryModal.tsx`:
- Delete the `Reclassify Uncategorized (N)` button block (header).
- Remove `reclassifying` state, `handleReclassify`, `uncategorizedCount` (no longer needed for the button), and the `Sparkles` icon import.
- Delete the edge function directory `supabase/functions/reclassify-uncategorized-invitations/` and its entry in `supabase/config.toml`.

Single-category enforcement (one image = one category) and existing upload-time auto-classification stay untouched.

### 2. New Per-Card "Categorize" Button (admin only)
On each image card hover overlay, below the existing `View / Select / Delete` buttons, add a fourth button **Categorize** (visible only when `isAdmin === true`).

Clicking it opens a small Popover anchored to the card containing:

```text
[ Search/scroll list of existing categories ]
  Floral (175)
  Glamour (66)
  Wedding (11)
  ...
  Uncategorized (107)
─────────────────────
+ Create New Category
```

- Selecting an existing category → calls `replaceImageCategories(imageId, [name])` from `invitationUploadUtils.ts` (already wipes existing rows, inserts one). On success: toast, optimistic local update, `refetch()`.
- Clicking **+ Create New Category** swaps the popover body to a small input + Save / Cancel row. On Save:
  1. Insert into `invitation_categories` (name trimmed, unique-safe via `upsert` on name).
  2. Call `replaceImageCategories(imageId, [newName])`.
  3. Toast, refetch (counts + dropdown update automatically since `useInvitationGallery` recomputes from images).

### 3. Behavior Rules
- Admin-only — non-admins never see the Categorize button or popover.
- Single-category-only — replacement always wipes prior assignments (already enforced by `replaceImageCategories`).
- Live updates — after assignment, the gallery refetches; the header dropdown counts and the `Uncategorized` count update automatically.
- Applies to ALL images, not just uncategorized ones.
- Modal layout, header dropdown, thumbnail grid, styling, counts all remain exactly as-is.

### Files to Edit
- `src/components/Dashboard/Invitations/InvitationGalleryModal.tsx` — remove reclassify UI/logic; add Categorize button + Popover (using existing `@/components/ui/popover`).
- `supabase/config.toml` — remove the `reclassify-uncategorized-invitations` function entry.
- `supabase/functions/reclassify-uncategorized-invitations/` — delete folder.

No DB migration required — `invitation_categories` and `invitation_image_categories` tables already support insert/replace through existing client code.
