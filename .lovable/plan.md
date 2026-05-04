## Goal
Add a date-based privacy gate to the "Update & Confirm Your Details" search in `src/pages/GuestLookup.tsx`. Before the wedding date: strict full-name match only, no suggestions. On/after the wedding date: current behaviour preserved verbatim. UI, layout, input, buttons, cards, visualization tab, RSVP logic, and backend remain untouched.

## Behaviour
- **Open mode** (today ≥ `event.date` in event timezone, or no date set): existing partial-search logic kept exactly as-is, including the existing AlertCircle + "No guests found / Please check your spelling…" empty state.
- **Strict mode** (today < `event.date`):
  - Normalise input (trim, lowercase, collapse whitespace).
  - No space in input → return `[]` and render nothing (no suggestions, no message).
  - Space in input → match only when normalised `"${first} ${last}"` strictly equals the normalised input.
  - Full-name attempt with zero matches → show only: *"No match found. Please enter your full name exactly as provided."*

## Edits — single file: `src/pages/GuestLookup.tsx`

1. **Add `isOpenSearchMode` memo** beside the existing `isEventDay` memo (~line 173):
   ```ts
   const isOpenSearchMode = useMemo(() => {
     if (!event?.date) return true; // fail-open
     const tz = event.event_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
     const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
     return todayStr >= event.date;
   }, [event?.date, event?.event_timezone]);
   ```

2. **Add `normalize` helper** inside the component, just above the `filteredGuests` memo:
   ```ts
   const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, ' ');
   ```

3. **Wrap `filteredGuests` memo** (~line 338) with the mode branch. Open-mode body is the existing logic verbatim; strict-mode body returns `[]` for spaceless input, otherwise filters by exact normalised full-name equality. Add `isOpenSearchMode` to deps. Note: actual state variable is `searchTerm` (not `searchQuery`) — strict branch uses `normalize(searchTerm || '')`.

4. **Update search-tab empty state** (~line 845–852):
   - Compute `const normalizedInput = normalize(searchTerm || '');` and `const isFullNameAttempt = normalizedInput.includes(' ');` near the render.
   - Open mode → render existing AlertCircle + "No guests found / Please check your spelling…" exactly as today.
   - Strict mode + `isFullNameAttempt` + `filteredGuests.length === 0` → render only the text *"No match found. Please enter your full name exactly as provided."* (no icon, no extra paragraph).
   - Strict mode + partial input → render nothing.
   - Also gate the outer `searchTerm.length >= 2` block so strict-mode partial input renders nothing at all (no "Welcome,…" header, no list).

## Untouched
Input field, placeholder, icons, EnhancedGuestCard, Accept/Decline/Add Guest, modals, success/loading/animation states, visualization tab (~line 958), RSVP normalisation, RLS/RPCs/backend, all other pages and components.

## Verification
- System date < event date → "And"/"Andrew" returns nothing, no message; "Andrew Smith" returns the matching card; "Andrew Smithx" shows the new strict copy only.
- System date ≥ event date → today's partial-search behaviour and existing "No guests found" empty state are unchanged.
