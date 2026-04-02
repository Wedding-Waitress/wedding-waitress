
Plan: Fix the remaining multiline typing bug in Running Sheet “Who” textboxes

Summary

The remaining problem is not in the textarea component itself. It is most likely caused by the dashboard Running Sheet hook re-fetching the whole sheet after its own autosave, which interrupts controlled textarea typing right after Enter/newline. That matches your symptom exactly: first line works, then after pressing Enter the next letters get dropped or the field behaves strangely.

What I found

- `RunningSheetRow.tsx` already supports multiline text correctly and is not the main problem.
- `RunningSheetPublicView.tsx` already has the new `lastSaveRef` guard and 300ms save timing.
- But `useRunningSheet.ts` still:
  - uses a dashboard realtime subscription that always calls `fetchSheet()` on every item change
  - uses one shared debounced saver for all row edits
  - has no self-save guard
- `useDJMCQuestionnaire.ts` has the same dashboard-side realtime refetch pattern, so it can suffer from the same interruption issue too.

Implementation plan

1. Fix dashboard Running Sheet autosave feedback loop
- Update `src/hooks/useRunningSheet.ts`
- Add a `lastSaveRef` timestamp like the public shared view uses
- Before each local row save, mark `lastSaveRef.current = Date.now()`
- In the dashboard realtime subscription, ignore `running_sheet_items` events that happen inside a short cooldown window after a local save
- Keep external vendor edits syncing in normally after that cooldown

2. Replace the single shared debounce with per-row debounce
- Still in `src/hooks/useRunningSheet.ts`
- Replace the current single lodash debounced function with per-item timeouts keyed by row id
- This prevents one row edit from cancelling or interfering with another row’s save
- Reduce debounce to 300ms so multiline typing feels immediate

3. Keep local textarea state stable during typing
- Preserve the current optimistic update pattern
- Prevent full-sheet refetches from interrupting active typing in the “Who” column
- Only fall back to `fetchSheet()` on real save failures or truly external changes

4. Apply the same dashboard-side protection to DJ-MC
- Update `src/hooks/useDJMCQuestionnaire.ts`
- Add the same self-save realtime guard for item/section updates
- Prevent dashboard questionnaire typing from being interrupted by its own realtime echo
- Keep cross-user sync intact

Files to change

- `src/hooks/useRunningSheet.ts`
- `src/hooks/useDJMCQuestionnaire.ts`

No planned changes

- `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`
- `src/components/Dashboard/RunningSheet/RunningSheetSection.tsx`

Why this should fix your exact bug

Current flow is effectively:

```text
type in Who field
-> optimistic local update
-> autosave fires
-> realtime event arrives from that same save
-> whole sheet re-fetches
-> textarea re-renders while user is typing
-> cursor/value gets disrupted, especially after Enter
```

After the fix:

```text
type in Who field
-> optimistic local update
-> autosave fires
-> self-triggered realtime event is ignored
-> textarea keeps its local typing state
-> external edits from other people still sync in
```

Expected result

- Pressing Enter in any “Who” textbox will reliably create a new line
- Typing on the next line will continue normally without dropped letters
- Autosave will still happen quickly in the background
- Vendor/shared-link edits will still sync back into the dashboard
- DJ-MC dashboard editing will be protected by the same fix
