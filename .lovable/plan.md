# Run Sheet Public Share — Fix Label + Jitter

## Root causes

### 1. "Running Sheet" still showing in the section header
The client-side coercion (`section_label === 'running sheet' → 'Run Sheet'`) is in place, but the underlying DB value (`running_sheets.section_label`) is still `"Running Sheet"`. The locked `RunningSheetSection` component renders `label` directly — coercion works when the share view loads it, but if for any reason the value re-flows back through code paths that don't coerce, it shows the raw value. The real fix is to **normalize the stored value once** so no further coercion is needed.

The invite text at line 399 (`"...the run sheet of"`) is already lowercase. No change needed there.

### 2. Page shakes / hard to scroll on the public share page
There is a **realtime feedback loop**:
- `RunningSheetPublicView` subscribes to `running_sheet_share_tokens` UPDATE (lines 152–167) with **no debounce guard**.
- Calling the RPC `get_running_sheet_by_token` bumps `last_accessed_at` on that token row.
- That UPDATE fires the realtime listener → calls `fetchData` again → bumps `last_accessed_at` again → loop.
- Each loop replaces the `data` state object, re-mounting every row, dropdown, textarea, and the sticky header — causing visible jitter and stealing scroll focus.

The items channel (line 132) has a `lastSaveRef < 2000ms` guard, but `lastSaveRef` is only updated in user-save paths, never in `fetchData`. So that guard doesn't protect against the fetch-triggered loop either.

## Fix plan

### File: `supabase/migrations/<new>.sql` (new)
One-line normalize:
```sql
update public.running_sheets
   set section_label = 'Run Sheet'
 where lower(trim(section_label)) = 'running sheet';
```

### File: `src/pages/RunningSheetPublicView.tsx`
1. Bump `lastSaveRef.current = Date.now()` at the start AND end of `fetchData` so any realtime echo within 2s is suppressed across all three channels.
2. Add the same `if (Date.now() - lastSaveRef.current < 2000) return;` guard inside the `running_sheet_share_tokens` UPDATE listener (currently missing).
3. Additionally, in that tokens listener, compare the new `permission` field to current state — only refetch if it actually changed (defense in depth, since `last_accessed_at` updates fire UPDATE events constantly).
4. Make the sticky header non-sticky on the public share page (`sticky top-0 z-10` → plain `border-b`) — when the realtime loop was running, the sticky header amplified the visual shake; removing sticky also prevents iOS scroll snap quirks on the share page. Leaves dashboard untouched.
5. No changes to the locked `RunningSheetSection`, hooks, routes, table names, or share URLs.

## Out of scope
- Locked public marketing/SEO pages.
- Locked `RunningSheetSection.tsx`, `RunningSheetPage.tsx`, `useRunningSheet.ts` business logic.
- Dashboard run sheet view (already correct).

## Verification
- Open a shared run sheet link → header reads "Run Sheet", page loads once, no shaking, normal vertical scroll on desktop + mobile.
- Run a quick `select section_label from running_sheets` after migration to confirm no rows still say "Running Sheet".
