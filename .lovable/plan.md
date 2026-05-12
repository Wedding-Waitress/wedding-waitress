# Invitation Gallery — One-Time Uncategorized Cleanup

## Scope
- Targets ONLY the 107 images currently in `Uncategorized`.
- Already-categorized images (Floral 175, Glamour 66, Baby Shower 16, Religious 13, Islamic 12, Wedding 11, Celebrations 7, Birthday 5, Tropical 3, Cultural 3) are NOT touched.
- Single-category-only enforcement (each image lives in exactly one category).
- No UI changes to dropdown, counts, modal layout, thumbnails, or styling.

## Approach: Admin-triggered Edge Function (one-time)

New edge function `reclassify-uncategorized-invitations` (admin-only, JWT verified):

1. Loads every image whose only category is `Uncategorized` (or has none).
2. For each image, calls Lovable AI Gateway (Gemini 2.5 Flash, vision) with the master image URL + filename hint.
3. Model returns ONE single best category from the allowlist.
4. Per image, in order:
   - `DELETE FROM invitation_image_categories WHERE image_id = $1` (guarantees single-category rule).
   - Upsert chosen category into `invitation_categories` (creates new ones on demand).
   - Insert ONE row in `invitation_image_categories`.
5. Small concurrency (5 in flight, ~200ms gap), retry on 429.
6. Returns `{ processed, perCategory, stillUncategorized, failed }`.

Admin-only **"Reclassify Uncategorized (N)"** button shown next to the dropdown when N > 0; auto-hides at 0. One click runs the function with toast progress, then refreshes.

## Single-Category Rule (Enforcement)

- Classifier prompt returns `{"category": "X"}` (string, not array).
- Server validates against allowlist; falls back to filename hint; final fallback `Uncategorized`.
- Always wipe existing rows for the image before inserting the new one.
- Existing upload classifier (`classify-invitation-image`) switched to single-category mode so future uploads can never appear in multiple filters.

## Final Category Allowlist

Existing kept: Baby Shower, Birthday, Celebrations, Cultural, Floral, Glamour, Islamic, Religious, Tropical, Wedding.

New added: **Asian, Chinese, Christmas, Elegant, Luxury, Minimal, Vintage, Kids**.

Removed from earlier draft (per user): ~~Neutral~~, ~~Gold~~, ~~Frame Borders~~ — folded into Elegant / Luxury / Floral / Minimal.

Fallback: Uncategorized (only if AI + filename both fail).

Dedup rules to avoid fragmentation:
- Wedding-floral → Floral (visual dominance wins).
- Gold luxury frame → Luxury.
- Beige/blank minimalist → Minimal.
- Quran/mosque → Islamic (not Religious).
- Christmas tree/wreath → Christmas (not Celebrations).
- Chinese double-happiness/lanterns → Chinese (not Asian unless pan-Asian).
- Decorative-only border designs → Elegant or Floral based on dominant motif.

## Files

- New: `supabase/functions/reclassify-uncategorized-invitations/index.ts`
- Edit: `supabase/functions/classify-invitation-image/index.ts` — return single category for future uploads.
- Edit: `src/components/Dashboard/Invitations/InvitationGalleryModal.tsx` — admin-only "Reclassify Uncategorized (N)" button next to dropdown, hidden when N=0.
- Edit: `src/components/Dashboard/Invitations/invitationUploadUtils.ts` — `assignCategoriesToImage` always wipes + inserts one row.
- No new DB tables, no migration (categories created on demand).

## Performance

- Runs once on demand (~107 vision calls, ~2–4 minutes).
- Saved permanently. Gallery open path unchanged.

## Out of scope

- Re-classifying the 391 already-categorized images.
- Bulk admin merge/move tools.
- Any visual/layout changes.
