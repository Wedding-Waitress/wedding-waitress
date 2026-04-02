

## Plan: Fix Shared Link Auto-Save Not Persisting

### Root Cause

The save code in `RunningSheetPublicView.tsx` (line 161-198) already correctly implements auto-save via the `update_running_sheet_item_by_token` RPC with 300ms debounce. The shared link edits update the local UI optimistically but the RPC call persists changes to the database.

**However**, there are two issues to address:

### Issue 1: Duplicate RPC Function Overloads

There are **two versions** of `update_running_sheet_item_by_token` in the database — one with 5 parameters and one with 9 parameters. When the Supabase client sends a subset of named parameters (e.g., just `share_token`, `item_id`, `new_responsible`), PostgreSQL may fail to resolve the correct overload, silently returning an error or picking the wrong function. This can cause saves to fail.

**Fix**: Drop the older 5-parameter version via a migration, keeping only the 9-parameter version (which handles all fields via COALESCE defaults).

### Issue 2: Publishing Required

Shared links open on `weddingwaitress.com` (the published domain), not the Lovable preview. Any code fixes only take effect on shared links **after you click Publish**. The dashboard preview works because it runs the latest code, but the shared link still runs the last-published version.

### Changes

1. **Database migration** — Drop the 5-parameter overload of `update_running_sheet_item_by_token`, keeping only the 9-parameter version
2. **Add error feedback in public view** — Add a small "Saving..." / "Saved" indicator in the public view header so users can confirm their edits are persisting (similar to how Google Docs shows save status)
3. **After implementation** — You must click **Publish** for the shared link to use the updated code

### Files to Change
- New migration file to drop the duplicate RPC
- `src/pages/RunningSheetPublicView.tsx` — add save status indicator

