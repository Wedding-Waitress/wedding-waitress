I checked Supabase fresh:

- `public.invitation_gallery_images` still has 410 rows.
- The `invitation-gallery` Supabase Storage bucket currently shows 0 stored objects, so the visible gallery items are coming from database records, not remaining bucket files.
- The previously created purge Edge Function has no logs, which means it was not successfully invoked/run from the app or dashboard.

Best quickest solution:

1. Run a single targeted database purge for only `public.invitation_gallery_images`.
   - This removes all 410 Invitation Image Gallery entries at once.
   - It does not touch seating chart signs, place cards, event data, guest data, invitations created by users, or any other page/section.

2. Verify immediately after the purge:
   - Confirm the table count is 0.
   - The Invitation Image Gallery should then show “0 Total Designs” / empty gallery.

3. No temporary button is needed for this immediate cleanup.
   - The one-click admin button is only useful if you expect to bulk-clear the gallery again later.
   - For now, the fastest and safest path is a direct targeted database delete.

Technical detail:

```sql
DELETE FROM public.invitation_gallery_images;
```

This is intentionally scoped to the invitation gallery table only.