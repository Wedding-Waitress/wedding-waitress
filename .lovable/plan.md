# Mobile +1 Highlight on Guest List Cards (Final)

## Scope
Mobile guest cards only (`lg:hidden` block in `src/components/Dashboard/GuestListTable.tsx`, ~lines 1885–2068). Desktop table untouched.

## Detection
```ts
const hasPlusOneAlert =
  !!guest.notes?.startsWith('[NEW+]') && !ackedPlusOneIds.has(guest.id);
```

## Behaviour
1. Highlight + badge + pulse appear whenever `hasPlusOneAlert` is true (independent of selection).
2. Tapping **Select Guest** OR **Edit** acknowledges optimistically (instant UI), then `updateGuest` runs in the background to strip `[NEW+]` from `notes`.
3. A cleanup `useEffect` keeps `ackedPlusOneIds` in sync with realtime/refetched `guests` — entries whose `notes` no longer contain `[NEW+]` are removed from the local set.

## Changes

### 1. `src/components/Dashboard/GuestListTable.tsx`

**a) Add local ack state, optimistic helper, and cleanup effect** (~after line 176 where `useRealtimeGuests` is destructured):

```ts
const [ackedPlusOneIds, setAckedPlusOneIds] = useState<Set<string>>(new Set());

const acknowledgePlusOneOptimistic = (guest: any) => {
  if (!guest?.notes?.startsWith('[NEW+]')) return;
  setAckedPlusOneIds(prev => {
    if (prev.has(guest.id)) return prev;
    const next = new Set(prev);
    next.add(guest.id);
    return next;
  });
  const cleanedNotes = guest.notes.replace(/^\[NEW\+\]/, '');
  updateGuest(guest.id, { notes: cleanedNotes }).catch(() => {});
};

// Keep local ack set in sync with realtime backend state
useEffect(() => {
  setAckedPlusOneIds(prev => {
    if (prev.size === 0) return prev;
    let changed = false;
    const next = new Set(prev);
    guests.forEach(g => {
      if (!g.notes?.startsWith('[NEW+]') && next.has(g.id)) {
        next.delete(g.id);
        changed = true;
      }
    });
    return changed ? next : prev;
  });
}, [guests]);
```

**b) Mobile card (~lines 1934–1961)** — derive `hasPlusOneAlert`, restyle Select button, add badge:

```tsx
const isSelected = selectedGuestIds.has(guest.id);
const hasPlusOneAlert =
  !!guest.notes?.startsWith('[NEW+]') && !ackedPlusOneIds.has(guest.id);
return (
  <div
    key={`m-${guest.id}`}
    className={cn(
      "bg-white rounded-2xl shadow-sm border-2 border-[#967A59] p-4 transition-all",
      isSelected && "ring-2 ring-primary",
      hasPlusOneAlert && "animate-row-flash"
    )}
  >
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => {
          if (hasPlusOneAlert) acknowledgePlusOneOptimistic(guest);
          handleSelectGuest(guest.id, !isSelected);
        }}
        aria-pressed={isSelected}
        className={cn(
          "ww-small-pill",
          isSelected && "ww-small-pill--active",
          hasPlusOneAlert &&
            "!bg-[#FEF3C7] !border-2 !border-red-500 !text-[#1D1D1F] animate-plus-one-pulse"
        )}
      >
        {isSelected ? '✓ Selected' : 'Select Guest'}
      </button>
    </div>

    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
      <span className="font-bold text-base text-[#1D1D1F] truncate">
        {guest.first_name} {guest.last_name}
      </span>
      {hasPlusOneAlert && (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#FEF3C7] border border-[#967A59] text-[#1D1D1F]">
          +1 Added
        </span>
      )}
    </div>
```

**c) Edit button (~line 2049)** — also acknowledge instantly:

```tsx
onClick={() => { acknowledgePlusOneOptimistic(guest); handleEditGuest(guest); }}
```

### 2. `src/index.css` — add pulse keyframe (mobile-only via class; disabled ≥ lg):

```css
@keyframes pulseHighlight {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); opacity: 1; }
  50%      { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); opacity: 0.92; }
}
.animate-plus-one-pulse {
  animation: pulseHighlight 1.8s ease-in-out infinite;
}
@media (min-width: 1024px) {
  .animate-plus-one-pulse { animation: none; }
}
```

## Locked-file note
`src/components/Dashboard/GuestListTable.tsx` carries a production-locked header. Edits are mobile-only and additive (no layout/structure change to existing markup, no desktop changes). Approval to edit this locked file is required.

## Out of scope
Desktop table row, tablet ≥ `lg`, any other page or global style.
