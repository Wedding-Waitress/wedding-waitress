## Root cause

The TUS resumable upload create request is rejected by the `storage.objects` INSERT policy `anon_insert_pending_event_media`:

```
WITH CHECK (
  bucket_id = 'event-media'
  AND EXISTS (
    SELECT 1 FROM public.event_media_items i
    WHERE i.storage_path = objects.name
      AND i.upload_status = 'pending'
      AND i.upload_token_expires_at > now()
  )
)
```

The `EXISTS` subquery is evaluated under the caller's role (`anon`). `public.event_media_items` has RLS enabled with only one policy (`owner_all_items`) that requires `auth.uid() = events.user_id`. For an anonymous guest, that policy returns zero rows, so the `EXISTS` is false and the storage insert is denied with `new row violates row-level security policy`.

Desktop appeared to work only because the browser had an authenticated owner session, which satisfied the owner policy. True anonymous mobile traffic cannot satisfy it.

The hook (`src/hooks/useGuestMediaUpload.ts`), TUS headers, `register_event_media_upload` RPC, and the registered `storage_path` are all correct — `objects.name` equals the registered `storage_path` (`<event_id>/<item_id>.<ext>`). No client change is needed.

## Fix (single migration)

Replace the EXISTS subquery in the storage policy with a `SECURITY DEFINER` helper that bypasses RLS on `event_media_items` and answers the exact same question. This keeps the policy strict (only valid pending rows with non-expired tokens in the `event-media` bucket) while letting the anon role satisfy it.

1. Create `public.is_pending_event_media_path(_path text) returns boolean` — `SECURITY DEFINER`, `STABLE`, `search_path = public`. Returns true iff a row exists in `event_media_items` with that `storage_path`, `upload_status = 'pending'`, and `upload_token_expires_at > now()`.
2. `GRANT EXECUTE` on that function to `anon` and `authenticated`.
3. `DROP POLICY anon_insert_pending_event_media ON storage.objects` and recreate it for `INSERT TO anon, authenticated` with:
   ```
   WITH CHECK (bucket_id = 'event-media' AND public.is_pending_event_media_path(name))
   ```
4. Leave `owner_read_event_media` and `owner_delete_event_media` policies unchanged.

No changes to:
- `useGuestMediaUpload.ts` (headers already correct: `apikey` + `Bearer <anon-or-session-token>`)
- `register_event_media_upload` / `finalize_event_media_upload` RPCs
- QR, routing, dashboard
- `event_media_items` RLS (owner-only stays)

## Verification

After the migration, test as a true anonymous mobile guest (Safari iOS, no logged-in session, cellular network):

1. Scan event QR → public upload page loads.
2. Enter first name "Nader".
3. Pick a JPG photo from camera roll.
4. Tap **Share 1 file**.
5. Confirm: progress reaches 100%, thank-you screen appears, no 403.
6. Check DB: matching `event_media_items` row flips to `upload_status='uploaded'`; object exists in `event-media/<event_id>/<item_id>.jpg`.
7. Re-test with an MP4 to confirm video path still works.
8. Confirm owner dashboard gallery shows the new item in realtime.

## Final report (to be produced after build)

- Exact root cause (above).
- Files / SQL changed: one migration adding `public.is_pending_event_media_path` and replacing `anon_insert_pending_event_media`. No frontend file changes.
- Anonymous mobile test results from steps 1–8.
