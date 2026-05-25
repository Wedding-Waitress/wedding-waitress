## Photo & Video Gallery — Phase 1 (FINAL, approved with token-security clarification)

All previously approved decisions stand. Adding the upload-token hardening below.

### Locked decisions (unchanged)
- Instant uploads, host-only delete. No approval queue.
- Supabase Storage only. Private bucket `event-media`.
- Videos: `.mp4`/`.mov`, ≤100 MB, ≤180 s.
- Photos: jpeg/png/webp/heic, generous configurable per-event limits.
- Public route `/gallery/:token` (single line added to `App.tsx`).
- `event_media_upload_tokens.expires_at` is **nullable** — QR works indefinitely until host closes gallery.
- Phase 1 explicitly EXCLUDES: approval queue, slideshow, ZIP, password, themes, likes/comments, albums, voice notes, Cloudflare Stream.
- Two-step commit: rows start `pending`, only show in host gallery once `uploaded`.
- All anon access via SECURITY DEFINER RPCs. No public RLS policies on tables.
- Tables: `event_media_galleries`, `event_media_upload_tokens`, `event_media_limits`, `event_media_items`.

### Upload-token security (the only change since last plan)

Add three columns directly to `event_media_items` so the per-upload token is bound to that one row and cannot be reused:

```sql
alter table public.event_media_items add column upload_token_hash text;          -- sha256 hex of raw token, never the raw value
alter table public.event_media_items add column upload_token_expires_at timestamptz;
alter table public.event_media_items add column upload_token_used_at timestamptz;
```

Hashing helper (pgcrypto already enabled in this project):

```sql
create or replace function public._hash_upload_token(_raw text)
returns text language sql immutable as $$
  select encode(digest(_raw, 'sha256'), 'hex')
$$;
```

#### `register_event_media_upload` (anon, SECURITY DEFINER)
1. Validate token row in `event_media_upload_tokens` (exists, gallery `is_open`, `expires_at IS NULL OR expires_at > now()`, `max_uploads` not exceeded).
2. Enforce all per-event limits (mime allow-list, photo/video byte cap, video duration ≤180s, photo+video counts, total bytes).
3. Generate raw upload token: `_raw := encode(gen_random_bytes(32), 'hex')`.
4. Insert row with `upload_status='pending'`, `upload_token_hash = _hash_upload_token(_raw)`, `upload_token_expires_at = now() + interval '15 minutes'`, `upload_token_used_at = NULL`.
5. Return `{ item_id, storage_path, upload_token: _raw }` **once**. Raw value is never persisted.

#### `finalize_event_media_upload(_item_id uuid, _upload_token text)` (anon, SECURITY DEFINER)
Succeeds only if ALL true:
- row exists with `id = _item_id`
- `upload_status = 'pending'`
- `upload_token_hash = _hash_upload_token(_upload_token)`
- `upload_token_used_at IS NULL`
- `upload_token_expires_at > now()`

On success: `upload_status='uploaded'`, `uploaded_at=now()`, `upload_token_used_at=now()`, increment `event_media_upload_tokens.uploads_used`. Returns boolean.

On any failed check: returns `false`, no state change. Function never reveals which check failed.

#### `fail_event_media_upload(_item_id uuid, _upload_token text)` (anon, SECURITY DEFINER)
Same validation as finalize except it also accepts rows whose token is expired (so the client can mark cleanup). Sets `upload_status='failed'` and `upload_token_used_at=now()`. Idempotent.

#### Storage policy
Object insert into `event-media` allowed when the path matches `{event_id}/{item_id}.{ext}` AND a `pending` row exists for that `item_id` with `upload_token_expires_at > now()`. This means even if someone guesses a storage path, they cannot upload without a live pending row created by the RPC.

#### Host RPCs (unchanged)
- `get_event_media_items_host(_event_id)` returns only `upload_status='uploaded'` rows.
- `get_event_media_signed_urls`, `delete_event_media_item`, `set_event_media_gallery_open` as previously planned.

### Cleanup
Stale rows where `upload_status='pending'` AND `upload_token_expires_at < now() - interval '1 hour'` are eligible for cleanup. Phase 1: simply leave them — they are filtered out of the host view. No cron job in Phase 1.

### Files (unchanged from prior plan)
- Migration: tables + RPCs + bucket + storage policies + token-hash columns + hash helper.
- Public page: `src/pages/GuestMediaUpload.tsx`.
- Dashboard page: `src/components/Dashboard/PhotoVideoGallery/` (Page, SetupCard, LimitsCard, Grid, Lightbox, GuestbookList).
- Hooks: `useEventMediaGallery.ts` (host), `useGuestMediaUpload.ts` (tus + 2-step commit + token handling).
- Validation: `src/lib/mediaValidation.ts`.
- Edits (minimal): `src/App.tsx` (add `/gallery/:token`), `src/components/Layout/AppSidebar.tsx` (one entry), `src/pages/Dashboard.tsx` (one tab case).
- Wraps content in `PinchZoomContainer` per global rule. All new buttons get `lv-premium-shade`.

### Test checklist (final report will confirm)
1. Migration applies cleanly; pgcrypto available; defaults seeded.
2. Token-hash columns exist; raw token returned by `register_*` is NOT stored anywhere in plain text (verified by SELECT).
3. `finalize_*` succeeds with correct raw token → row goes `uploaded`, `upload_token_used_at` set.
4. `finalize_*` second call with same token → returns false, no state change.
5. `finalize_*` with wrong token → returns false.
6. `finalize_*` after `upload_token_expires_at` → returns false.
7. `finalize_*` on a row already `uploaded` or `failed` → returns false.
8. Storage insert rejected when no live pending row exists.
9. >100 MB or >180 s or wrong mime rejected client-side AND in `register_*`.
10. Per-event count + total-bytes limits enforced server-side.
11. Closing tab mid-upload leaves row `pending` → host gallery does not show it.
12. Host delete removes row + storage object.
13. Realtime: new `uploaded` item appears in host grid without refresh.
14. Token with `expires_at = NULL` keeps working indefinitely; toggling gallery closed blocks new registrations.
15. RLS: anon cannot SELECT `event_media_items`, `event_media_upload_tokens`, or `event_media_galleries` directly.
16. Mobile (375px) guest upload UI verified.
17. No file outside the listed set was modified.

### Explicitly NOT touched
Guest List, Tables, Seating Charts, DJ-MC, Running Sheet, Stationery, Invitations, QR Code Seating Chart settings, Pricing, Landing, Blog, Auth, all locked public surfaces, all locked stable pages.

Ready to build on approval.
