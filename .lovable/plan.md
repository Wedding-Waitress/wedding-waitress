## Live View Guest Card Refinements

Scope is strictly limited to the guest result card and the welcome banner above it. Header, countdown, search input, the 6 info cards, and footer remain untouched.

### 1. `src/pages/GuestLookup.tsx` (welcome banner only, ~line 800-805)

- Keep the centered "Welcome, {first_name} 👋" line.
- Remove the secondary line "You are seated at Table {table_no}" entirely (including its wrapper if it becomes empty).

### 2. `src/components/GuestLookup/EnhancedGuestCard.tsx`

**Header row (guest name + Update button):**
- Remove the `Update Your Details` button from the top-right.
- Restructure the top of the card so the guest name (`{first_name} {last_name}`) is centered at the top: `text-center font-bold text-lg md:text-xl text-[#1D1D1F]`.
- Keep `relation_display`, the "RSVP date passed" notice, and contact info (email/mobile) directly under the name, also centered for visual balance.

**Table assignment row:**
- Remove the highlighted container styling (`bg-primary/5 border border-primary/30`), the inner pill (`bg-primary/10 border border-primary/40 ...`), and the `animate-[pulse_3s_ease-in-out_infinite]` animation.
- Replace with the same neutral row pattern used by Seat / Dietary:
  ```
  <div className="flex items-start gap-3 p-2 bg-background-subtle rounded-lg">
    <Users className="w-5 h-5 text-primary mt-0.5" />
    <div className="flex-1">
      <div className="font-semibold text-foreground">Table {guest.table_no}</div>
      <div className="text-sm text-muted-foreground">Your assigned table</div>
    </div>
  </div>
  ```
- Keep the existing "No Table Assigned" fallback (already neutral styling).

**Bottom section (action buttons + new Update button):**
- Keep existing centered action row exactly as is: Accept (green) / Decline (red) / Add Guest (brown).
- Below that row, add a divider: `<div className="my-4 border-t border-border" />`.
- Below the divider, add a centered Update button (only when `onEdit && isEditable`):
  ```
  <div className="flex justify-center">
    <Button
      onClick={() => onEdit(guest)}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
    >
      Update Your Details
    </Button>
  </div>
  ```
- RSVP Deadline line stays at the very bottom, unchanged.

### Final card flow

1. Centered guest name (+ relation/contact)
2. Table row (neutral, matches Seat/Dietary)
3. Seat row (unchanged)
4. Dietary row (unchanged)
5. Additional Guests row (unchanged)
6. RSVP Status row (unchanged)
7. Accept / Decline / Add Guest buttons (unchanged)
8. Divider
9. Centered "Update Your Details" button
10. RSVP Deadline (if present)

### Out of scope (not touched)
- `GuestLookup.tsx` outside the two-line welcome banner edit
- Header image, countdown, search input, the 6 info cards, share button, footer logo
- Any other page or component
