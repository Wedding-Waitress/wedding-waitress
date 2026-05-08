# Global Event Selection Synchronization & Context Stability — Audit + Fix Plan

This is an additive stabilization pass. No redesign. No new selector UI. No Stripe/public-route structural changes. No breaking state-management rewrite.

---

## Findings (audit)

### 1. Duplicate selection state in `src/pages/Dashboard.tsx`
- Two parallel state atoms exist: `selectedEventId` (Tables/Guest List path) and `globalSelectedEventId` (all other tabs). Both are kept in sync today through `handleGlobalEventSelect`/`handleEventSelect`, but the duplication is fragile — any new entry point that updates only one of them will silently desync.

### 2. Two storage backends for the same concept
- `Dashboard.tsx` persists to **sessionStorage** key `ww:session_selected_event`.
- `GuestListTable.tsx` (standalone path, lines 609–625, 696–710) persists to **localStorage** key `active_event_id`.
- These never read each other. On a fresh tab, sessionStorage is empty so the user is dropped to "no event" even though localStorage still has a valid ID.

### 3. Three different "active event" concepts
- `Dashboard.selectedEventId` = the event the user is editing.
- `useEvents.activeEventId` (persisted via `profile.display_countdown_event_id`) = the event whose countdown shows in the header.
- `GuestListTable` local fallback.
None are wired to a single source of truth.

### 4. Module-level caches not cleared on sign-out / account switch
- `eventsCache` in `useEvents.ts` (line 51) and `guestsCache` Map in `useRealtimeGuests.ts` (line 45) are never cleared on `SIGNED_OUT` or user change. On the same device, a second account briefly sees the first account's data before refetch.

### 5. Stale selection after event deletion
- `useEvents.deleteEvent` clears its own `activeEventId` (line 273), but `Dashboard.selectedEventId` / `globalSelectedEventId` and the sessionStorage/localStorage keys are NOT cleared. UI keeps a dangling `eventId` until the user manually picks another event.

### 6. Initial mount falls through to "no event" when stored ID is gone
- `Dashboard.tsx` lines 192–206: if `sessionStorage` holds an ID that no longer exists in `events`, the effect simply doesn't initialize — there is no fallback to the first available event.

### 7. New events do not auto-select
- `useEvents.createEvent` sets the countdown's `activeEventId` but Dashboard's `selectedEventId` stays unchanged. The just-created event is not the current editing context.

### 8. Realtime channel naming
- `useEvents` subscribes to a fixed channel name `events-changes`. If the hook is mounted twice (rare but possible during fast re-renders / route transitions), Supabase will reject the second `.subscribe()` silently. Suffix with `user.id` to make it unique-per-user and safe.
- `useRealtimeGuests` already keys its channel by `eventId` and disposes via `channelRef`; verified clean.

### 9. Public routes are isolated, but the user cache is shared by name
- `/s/:slug`, `/kiosk/:slug`, `/dj-mc`, `/running-sheet`, `/seating-chart` use their own RPCs and do not touch `eventsCache` / `guestsCache`. Confirmed no leakage. No change needed beyond keying caches by `user.id` (item 4) for defence in depth.

### 10. Dead/redundant code candidates (only after fixes verified)
- `GuestListTable.tsx` standalone localStorage path (`active_event_id`) becomes dead once Dashboard is the sole writer of the unified key.

---

## Fixes (Phase B — implementation)

### B1. Single source of truth for "current event"
- Add `src/hooks/useSelectedEvent.ts` (thin wrapper, NOT a context rewrite): exposes `{ selectedEventId, selectedEvent, setSelectedEventId }`. Backed by a module-level subscribable store + `localStorage` key `ww:selected_event_id` (single key, replaces both existing keys). Reads sessionStorage and old localStorage key once on first import for migration, then deletes them.
- `Dashboard.tsx`: replace the two `useState` atoms with this hook. Keep all existing prop names (`selectedEventId`, `onEventSelect`) so child components are untouched.

### B2. Auto-recover invalid / deleted selections
- In the same hook, when `events` arrives:
  - If stored ID is missing from `events`, fall back to the first event and persist.
  - If `events` is empty, set `null`.
- In `useEvents.deleteEvent`: after delete, if the deleted ID equals the current selection, clear the unified key (event `'ww:selected-event-cleared'` will let the hook re-pick).

### B3. Auto-select newly created events
- `useEvents.createEvent`: after insert, dispatch a `'ww:selected-event-set'` with the new id so `useSelectedEvent` updates everywhere.

### B4. Cache hygiene on auth changes
- `useEvents.ts`: in `onAuthStateChange`, on `SIGNED_OUT` clear `eventsCache = null` and dispatch a global `'ww:auth-cleared'` event.
- `useRealtimeGuests.ts`: listen for `'ww:auth-cleared'` and `guestsCache.clear()`. Same pattern for any other module-level Map caches discovered during implementation (quick grep for `new Map<string` at module scope).
- Also clear the unified selection key on sign-out.

### B5. Realtime channel uniqueness
- `useEvents.ts`: change channel name from `events-changes` to `events-changes:${user.id}` to prevent silent collisions on remounts.

### B6. Cross-page propagation verification (no code change unless gap found)
- Walk every tab in `Dashboard.tsx` lines 627–659 and confirm each child receives the unified `selectedEventId`. The current wiring already passes `globalSelectedEventId` to all of them — only `SignagePage` (line 629) and `GuestListTable` (line 460) currently use the `selectedEventId` variant. After B1, both names point at the same value, so behaviour is preserved.

### B7. Dead code removal (only after the above land and pass)
- Remove `GuestListTable.tsx` localStorage block (lines 609–625) and the `localStorage.setItem('active_event_id', …)` write in `handleEventSelect`. Standalone usages (if any) now go through the unified hook.
- Remove the legacy `handleEventSelect` alias in Dashboard if no remaining caller is found.

---

## What is explicitly NOT changing
- No redesign of My Events, Dashboard, Tables, Guest List, or any locked page.
- No change to Stripe/account flows.
- No change to public route URLs, RPC contracts, or token logic.
- Auth modals (`src/components/auth/*`) untouched.
- Locked Guest List desktop table layout untouched.
- `useEvents.activeEventId` (countdown / `display_countdown_event_id`) kept as a separate concept — only its name and behaviour are documented, not changed.

---

## Test matrix (manual, after fixes)
- Switch event in header → Tables, Guest List, Seating Charts, QR, Place Cards, Kiosk, Floor Plan, Running Sheet, DJ-MC, Invitations all rebind to new event with no stale rows.
- Refresh on each tab → same event still selected.
- Delete the currently-selected event → UI falls back to first remaining event, no dangling ID.
- Create a new event → it becomes the active selection immediately.
- Sign out → caches empty; sign in as second account → no first-account data flashes.
- Open `/s/:slug` and `/kiosk/:slug` in another tab while switching dashboard events → public views unaffected.
- Mobile (390×844) and tablet (834×1194): event dropdown switching, sticky bottom actions, no horizontal scroll.

---

## Files likely touched
- `src/hooks/useSelectedEvent.ts` (new, ~60 lines)
- `src/hooks/useEvents.ts` (cache clear, channel suffix, auto-select on create, clear on delete)
- `src/hooks/useRealtimeGuests.ts` (cache clear on auth event)
- `src/pages/Dashboard.tsx` (replace two `useState` atoms with hook)
- `src/components/Dashboard/GuestListTable.tsx` (remove dead localStorage block)

## Deliverable
After implementation: concise report listing issues found, fixes applied, residual risks (e.g. any other module-level Map caches discovered), and the tested flows above with pass/fail.
