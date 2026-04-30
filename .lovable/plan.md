## Live View — personal welcome + table highlight + smooth scroll

Polish-only enhancement to `/s/:eventSlug` Search tab + result card. Zero changes to header, countdown, the 6 cards, search input design, layout, or spacing. Uses existing brown palette and existing `animate-fade-in` utility.

### Files

1. `src/pages/GuestLookup.tsx`
2. `src/components/GuestLookup/EnhancedGuestCard.tsx`

### Changes

**A. `GuestLookup.tsx` — welcome banner + smooth scroll + fade-in**

- Add `searchResultsRef = useRef<HTMLDivElement>(null)` next to existing `tableTabRef` (line 129).
- Add `useEffect` that, when `searchTerm.length >= 2 && !searching && filteredGuests.length > 0`, calls `searchResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })` after ~150ms.
- Wrap existing search results block (lines 784–809) in `<div ref={searchResultsRef}>`.
- Above the result list (only when ≥1 match), insert personalised banner (centered, brown, fades in):
  ```tsx
  <div className="text-center mb-5 animate-fade-in">
    <div className="text-lg md:text-xl font-semibold text-primary">
      Welcome, {filteredGuests[0].first_name} 👋
    </div>
    {filteredGuests[0].table_no && (
      <div className="text-sm md:text-base text-muted-foreground mt-1">
        You are seated at Table {filteredGuests[0].table_no}
      </div>
    )}
  </div>
  ```
- Add `animate-fade-in` to the existing results list wrapper (fades + slight translateY in).

**B. `EnhancedGuestCard.tsx` — soft highlight box around the table number (lines 195–211)**

- When `guest.table_no` exists, swap the current `bg-background-subtle` row to a soft branded highlight: `bg-primary/5 border border-primary/30 rounded-lg p-3`.
- Wrap "Table {n}" text in an inline pill: `inline-flex items-center px-3 py-1 rounded-md bg-primary/10 border border-primary/40 text-primary font-bold` with very slow subtle pulse via `animate-[pulse_3s_ease-in-out_infinite]`.
- "No Table Assigned" branch keeps original neutral styling — no pulse, no brown highlight.
- No changes to other rows, spacing, or font.

### Animation

- Welcome banner + result wrapper: existing `animate-fade-in` (0.3s, fades + translateY 10px → 0).
- Table number pulse: slow 3s, brown tint only — minimal/elegant.
- Smooth scroll: native `scrollIntoView({ behavior: 'smooth' })` ~150ms after results render.

### Explicitly NOT changed

- Header video/image, countdown, "Update & Confirm Your Details" heading.
- The 6 cards (RSVP, Welcome Video, Table, Ceremony Floor Plan, Reception Floor Plan, Menu).
- Search input border / spacing / colors.
- Share button, footer logo, footer spacing.
- Any other tab, modal, or page.
