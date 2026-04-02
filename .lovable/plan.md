

## Fix: Running Sheet Shared Link Permission Sync + Last Used Timestamp

### Root Cause

The shared link stays "View Only" and editing doesn't work because **Supabase Realtime is not enabled** for the `running_sheet_items` or `running_sheet_share_tokens` tables. Only `events` and `guests` are published for Realtime. All the realtime subscription code we added is listening to channels that never fire.

Additionally, the public view only subscribes to `running_sheet_items` changes -- it never re-fetches when the **token's permission** changes. So even if realtime were enabled, toggling permission in the dashboard wouldn't update the public view badge.

### Changes

**1. Database Migration -- Enable Realtime on required tables**

Add `running_sheet_items` and `running_sheet_share_tokens` to Supabase Realtime publication so the existing subscription code actually receives events.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE running_sheet_items;
ALTER PUBLICATION supabase_realtime ADD TABLE running_sheet_share_tokens;
```

**2. `src/pages/RunningSheetPublicView.tsx` -- Subscribe to token permission changes + fix badge**

Add a second Realtime channel that listens to `running_sheet_share_tokens` changes (filtered by the token). When the owner toggles permission from the dashboard, the public view re-fetches and the badge updates from "View Only" to "Can Edit" (or vice versa), and the editable fields appear/disappear accordingly.

**3. `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx` -- Fix "Last used" timestamp format**

Change the date format from `MMM d, yyyy` to `d MMMM yyyy - h:mm a` so it displays like:
> Last used: 2 April 2026 - 3:45 PM

### Files to Edit
- New migration: enable Realtime on 2 tables
- `src/pages/RunningSheetPublicView.tsx` -- add token permission realtime subscription
- `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx` -- update date format

