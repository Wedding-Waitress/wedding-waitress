

## Plan: Shared Link Permission Sync, Inline Editing, and Per-Token Permission Toggle

### Problem Summary
1. The shared link badge shows "View Only" even when the token is set to "Can Edit" -- the permission change in the Create Link tab updates all tokens globally, but the actual DB update may fail silently (RLS issue) or the public view isn't re-fetching.
2. When permission is "Can Edit", the public Running Sheet view is read-only -- it needs inline editing capability.
3. No per-token permission toggle exists in the Manage tab -- the user cannot change a single token's permission without affecting all others.
4. Same issues exist for DJ-MC Questionnaire.

### Changes

**1. Fix per-token permission toggle in Share Modals (Running Sheet + DJ-MC)**

In `RunningSheetShareModal.tsx` and `DJMCShareModal.tsx`:
- Remove the global "update all tokens" behavior from the Create Link permission dropdown -- it should only set the permission for the **next** link created, not change existing ones.
- In the Manage tab, add a toggle/lock icon button **before** the Copy Link button for each token. Clicking it toggles between `view_only` and `can_edit` for that individual token and updates the DB.
- Use a `Shield` or `Lock`/`Unlock` icon from lucide-react to indicate the permission state.

**2. Create RPC: `update_running_sheet_item_by_token`**

New Supabase migration to create a SECURITY DEFINER function similar to the existing `update_dj_mc_item_by_token`:
- Accepts `share_token`, `item_id`, `new_time_text`, `new_description_rich` (jsonb), `new_responsible`
- Validates token has `can_edit` permission and is not expired
- Validates item belongs to the sheet associated with the token
- Updates the item and returns true/false

**3. Make Running Sheet Public View editable when `can_edit`**

In `RunningSheetPublicView.tsx`:
- When `data.permission === 'can_edit'`, render table cells as editable (contentEditable or input fields)
- On blur/change, call `update_running_sheet_item_by_token` RPC to persist changes
- Add Supabase Realtime subscription on the `running_sheet_items` table filtered by `sheet_id` so both the dashboard and public view stay in sync automatically

**4. Make DJ-MC Public View editable when `can_edit`**

In `DJMCPublicView.tsx`:
- When `data.permission === 'can_edit'`, make `value_text`, `music_url`, and `row_label` fields editable
- On blur, call the existing `update_dj_mc_item_by_token` RPC
- Add Realtime subscription on `dj_mc_items` for auto-sync back to dashboard

**5. Realtime sync back to dashboard**

The dashboard already uses Realtime subscriptions for guests/tables. The running sheet hook (`useRunningSheet.ts`) and DJ-MC hook (`useDJMCQuestionnaire.ts`) need Realtime channels on `running_sheet_items` and `dj_mc_items` respectively, so that when a vendor edits via the shared link, the dashboard reflects it instantly.

### Files to Edit
- `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx` -- per-token toggle, remove global update
- `src/components/Dashboard/DJMCQuestionnaire/DJMCShareModal.tsx` -- per-token toggle, remove global update
- `src/pages/RunningSheetPublicView.tsx` -- inline editing + realtime subscription
- `src/pages/DJMCPublicView.tsx` -- inline editing + realtime subscription
- `src/hooks/useRunningSheet.ts` -- add realtime channel for items
- `src/hooks/useDJMCQuestionnaire.ts` -- add realtime channel for items
- New migration: `update_running_sheet_item_by_token` RPC function

### Technical Detail: Per-Token Toggle UI

In the Manage tab, each token row will have a new button before Copy:
```
[🔓/🔒] [📋 Copy] [🔗 Open] [🗑️ Delete]
```
- Unlocked (Shield icon) = Can Edit (amber)
- Locked (ShieldCheck icon) = View Only (blue)
- Clicking toggles the individual token's permission via direct DB update

