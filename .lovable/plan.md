# Guest List — Mobile Header Reorder

## Scope
Single file: `src/components/Dashboard/GuestListTable.tsx` (the row currently at lines 1886–1915).

Desktop (`lg:` and up) is **completely unchanged**. Yellow plus-one notification, Step 3 box, all functionality, colors, and data logic are untouched.

## New mobile order (below Step 3, above guest cards)

```text
[ Step 3: Add Your Guests ]
[ Yellow +1 notification (only when triggered) ]
─────────────────────────────────────────────
[ Individual (pink) | Couple (orange) | Family (blue) ]   ← 3 equal columns
[ 🔍 Search guests............ ] [ 👥 78 Total ]          ← search flex-1, total fixed
[ Send digital invites & RSVP's … 'Select Guest' button ] ← centered pill
─────────────────────────────────────────────
[ Guest cards… ]
```

## Implementation

Replace the single responsive row (lines 1886–1915) with two siblings:

1. **Mobile block** (`lg:hidden`) — `mx-4` matching guest cards, `flex flex-col gap-3`:
   - Filter tabs: `grid grid-cols-3 gap-2`, each pill `h-8 rounded-full` keeping existing pink/orange/blue colors and dynamic counts (`individualCount`, `coupleCount`, `familyCount`).
   - Search + Total row: `flex items-center gap-2`. Search uses `flex-1 w-full h-10`. Total badge `h-10` shows `{guestCount} Total` with Users icon, white bg + primary border (unchanged styling tokens).
   - Instruction pill: existing primary/5 + border-2 styling, centered, mobile copy ("…by clicking the 'Select Guest' button for each guest.").

2. **Desktop block** (`hidden lg:flex`) — exact copy of current row markup with the desktop instruction copy ("…by checking the circles…"). No layout/style changes for `lg+`.

## Guarantees
- No changes to: functionality, data, colors, button styles, Step 3 box, yellow +1 notification, desktop layout, guest cards.
- Counts remain dynamic (same `individualCount` / `coupleCount` / `familyCount` / `guestCount` variables).
- Side margins (`mx-4`) match the mobile guest cards container (`px-4`) below for consistent alignment per project mobile rules.
- Touch targets ≥ 40px (filter pills `h-8`, search/total `h-10`).
