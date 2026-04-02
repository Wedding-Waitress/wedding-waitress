

## Plan: Fix Shared Link Save Persistence and Input Lag

### Problem Analysis
Two related bugs, both caused by the same root issue — a **realtime feedback loop**:

1. **Changes from shared link don't save**: When the DJ types, the optimistic update shows the change locally, the 600ms debounced RPC fires, but the realtime subscription also detects the DB change and calls `fetchData()`. This full re-fetch from the server overwrites the local optimistic state — often reverting the DJ's edits before they've fully persisted, making it appear that changes "don't save."

2. **Input lag in "Who" field (and other textareas)**: Same cause. Each keystroke triggers an optimistic update → debounced save → realtime event → full `fetchData()` re-render. The textarea loses its in-progress value and auto-resize recalculates, causing visible lag and lost keystrokes.

### Root Cause
Both `RunningSheetPublicView.tsx` and `DJMCPublicView.tsx` subscribe to realtime changes and call `fetchData()` on every change event — including changes triggered by the user's own saves. The dashboard hook (`useRunningSheet.ts`) has the same pattern but uses direct table `.update()` which is faster, reducing the window for conflict. The public views use RPC calls which are slower, widening the race window.

### Fix Strategy
**Suppress self-triggered refetches** using a "recently saved" guard. When the public view itself saves an item, set a short cooldown flag. During the cooldown, ignore realtime events (they're just echoes of our own save). After the cooldown, resume listening for external changes (from the dashboard owner).

### Files to Change

**`src/pages/RunningSheetPublicView.tsx`**:
- Add a `lastSaveRef` (timestamp) that gets set whenever a debounced save completes
- In the realtime subscription callback, skip `fetchData()` if `Date.now() - lastSaveRef.current < 2000` (2-second cooldown)
- Reduce debounce from 600ms to 300ms for snappier saves
- This ensures: DJ types → save fires → realtime event ignored (self-echo) → typing uninterrupted. Dashboard owner edits → no recent self-save → refetch fires → DJ sees update.

**`src/pages/DJMCPublicView.tsx`**:
- Identical fix: add `lastSaveRef` guard to suppress self-triggered realtime refetches
- Reduce debounce from 600ms to 300ms
- Apply to both item and section update handlers

### No Changes To
- `RunningSheetRow.tsx` — locked, no changes needed (textarea handling is fine)
- `RunningSheetSection.tsx` — locked, untouched
- `useRunningSheet.ts` — dashboard hook, untouched
- Database RPCs — all working correctly, the issue is frontend-only

### Expected Result After Fix
- DJ types in any field → instant optimistic update, no lag
- Save persists to database within 300ms of last keystroke
- Refreshing the page shows the saved data
- Dashboard owner sees DJ's changes via their own realtime subscription
- Dashboard owner's changes still sync to the DJ's shared link (after the 2s cooldown window)

