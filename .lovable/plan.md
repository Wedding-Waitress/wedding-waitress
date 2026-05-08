# Event Selection — Hardening Pass

Lightweight only. No redesign, no architecture changes.

## 1. Add testing infrastructure (only if missing)
- Add devDeps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Add `vitest.config.ts` (jsdom env, `@/` alias, `src/test/setup.ts`).
- Add `src/test/setup.ts` (jest-dom + matchMedia stub).
- Add `"vitest/globals"` to `tsconfig.app.json` types.

## 2. Tests for `useSelectedEvent`
File: `src/hooks/useSelectedEvent.test.ts`
- **Persistence**: `setSelectedEventId('a')` → `localStorage['ww:selected_event_id'] === 'a'`.
- **Legacy migration**: seed `sessionStorage['ww:session_selected_event']` and `localStorage['active_event_id']`, re-import module, assert unified key holds value and legacy keys removed.
- **Auto-recovery**: hook with stored id `'gone'` and events `[{id:'b'},{id:'c'}]` → resolves to `'b'`. Empty events → `null`.
- **Custom events**: `ww:selected-event-set`, `ww:selected-event-cleared`, `ww:auth-cleared` update state correctly.
- **Cross-tab**: synthetic `StorageEvent` for unified key updates hook value without remount.
- **Multi-tab deletion**: starting with events `[A,B]` and id `A`, re-render with events `[B]` → state becomes `B`.

## 3. Tests for `cacheRegistry`
File: `src/lib/cacheRegistry.test.ts`
- All registered clearers run on `ww:auth-cleared`.
- A throwing clearer does not stop subsequent clearers.

## 4. Tests for `useEvents` selection side-effects
File: `src/hooks/useEvents.selection.test.ts` (mocks supabase client + toast)
- `createEvent` success → `ww:selected-event-set` dispatched with new id.
- `deleteEvent` of currently-selected event → `ww:selected-event-cleared` dispatched.
- `SIGNED_OUT` → `ww:auth-cleared` dispatched and `eventsCache` reset.

## 5. Refactor the one remaining direct read
- `src/hooks/useEvents.ts` `deleteEvent`: replace `localStorage.getItem('ww:selected_event_id')` with `getSelectedEventId()` from `@/hooks/useSelectedEvent`. Keeps the hook as the only module touching the storage key.

## 6. Lint guard against legacy / direct event-storage reads
Add `scripts/check-event-storage.mjs` (run via `npm run check:storage`, also from a `pretest` script). It greps for any reference to the keys below **outside** `src/hooks/useSelectedEvent.ts`:
- `ww:selected_event_id`
- `ww:session_selected_event` (legacy)
- `active_event_id` (legacy, exact-token match — won't false-positive on `activeEventId`)

Existing per-event sort key (`guestSort_${eventId}`) and unrelated `ww:returnTab` / `ww:rsvpSelectedCount` / `ww:place_cards_selected_table` / `ww:individual_table_chart_*` keys are NOT event-id storage and are explicitly out of scope.

## 7. Final verification grep + report (per user request)
After all of the above land, run a single read-only sweep and include the output verbatim in the report:
```
rg -n "ww:selected_event_id|ww:session_selected_event|\bactive_event_id\b" src/
rg -n "(local|session)Storage\.(get|set|remove)Item\(['\"]ww:" src/ \
  | rg -v "ww:returnTab|ww:rsvpSelectedCount|ww:place_cards_|ww:individual_table_chart_"
rg -n "selectedEventId" src/ -l | xargs -I{} rg -n "useState<string \\| null>\\(null\\)" {} -l
```
Confirm:
- The only file matching the unified key is `useSelectedEvent.ts`.
- No file outside the hook reads/writes legacy keys.
- No component re-introduces a parallel `useState<string | null>` for event selection.

## What is NOT changing
- No selector UI changes.
- No additional hooks, no context provider, no architecture rewrites.
- Locked surfaces untouched (Landing, Dashboard shell, My Events, Tables, Guest List desktop table, auth modals).
- Stripe / public route logic untouched.
- Unrelated `sessionStorage` keys (`ww:returnTab`, `ww:rsvpSelectedCount`, place-cards / individual-chart selected table) remain — out of scope.

## Files touched
- new: `vitest.config.ts`, `src/test/setup.ts`, `src/hooks/useSelectedEvent.test.ts`, `src/lib/cacheRegistry.test.ts`, `src/hooks/useEvents.selection.test.ts`, `scripts/check-event-storage.mjs`
- edited: `package.json` (devDeps + scripts), `tsconfig.app.json` (types), `src/hooks/useEvents.ts` (replace direct localStorage read in `deleteEvent`)

## Deliverable
Concise hardening report: tests added with pass results, lint guard wired, the one direct-read refactor, and the verbatim final grep output proving `useSelectedEvent` is the single source of truth.
