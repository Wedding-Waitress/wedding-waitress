
Yes — I’m still on it, and I’ve now narrowed down the most likely root cause.

## What’s actually happening

The dashboard/share modal you are using is the latest preview code, but the share link itself is intentionally built to open:

```text
https://weddingwaitress.com/running-sheet/[event-slug]/[token]
```

That comes from `src/lib/urlUtils.ts`, which always uses `VITE_PUBLIC_BASE_URL="https://weddingwaitress.com"`.

So there are effectively two environments involved:

```text
Preview/editor dashboard  -> latest code
Public share link         -> published production frontend
```

Backend/database changes go live immediately, but frontend public-page changes do not go live until the frontend is published/updated. That explains the mismatch you’re seeing:
- the share modal shows the new permission controls
- the opened public link still shows the old red “View Only” state and old non-editable UI

There is also a second real code issue:
- `toggleTokenPermission()` in the Running Sheet share modal does not check the Supabase `error` response properly; it can show a success toast even if the update failed

## Fix plan

### 1. Keep scope tight: Running Sheet only
I will only touch the Running Sheet sharing/edit flow in this pass, so nothing unrelated changes.

### 2. Harden the permission toggle in `RunningSheetShareModal.tsx`
Update the token toggle logic so it:
- checks the actual Supabase `error`
- only shows success when the DB update truly succeeded
- shows a destructive error toast if the permission update failed
- refreshes token state only after confirmed success

This removes any false “Can Edit” state in the modal.

### 3. Harden `RunningSheetPublicView.tsx`
Update the public Running Sheet page so it:
- trusts the live RPC response from `get_running_sheet_by_token`
- re-fetches permission state more explicitly for the active token
- handles failed save attempts properly instead of silently swallowing them
- reverts optimistic edits if the token is not actually editable

This ensures the public page cannot appear editable when it is not, and cannot appear read-only after a valid `can_edit` response without surfacing an error.

### 4. Do not change the share-link domain logic
I will not alter `buildRunningSheetUrl()` or the production-domain link structure, because that is part of the established vendor-sharing system and should remain stable.

### 5. Release requirement
Because the public page is on the production domain, the frontend fix must be live on the published site for the share link to reflect the new behavior. The database changes are already live; the public UI fix depends on the production frontend being updated.

## Files to touch
- `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx`
- `src/pages/RunningSheetPublicView.tsx`

## Technical detail
No new database migration should be needed for this pass. The realtime publication changes are already in place. This pass is about:
- correcting silent client-side failure handling
- making the public page honor the real token state
- ensuring production/public behavior matches the dashboard behavior once the frontend update is live

## Expected result after implementation
After this fix is applied and the frontend is live on production:

```text
Dashboard modal: token shows “Can Edit”
        ->
Open link on weddingwaitress.com
        ->
Public header shows “Can Edit”
        ->
Time / Event / Who fields become editable
        ->
Changes save and sync back
```
