## Add Guest Modal — Mobile Overflow Fix

**Scope:** Mobile only (`max-lg:` breakpoints). Desktop/tablet untouched.
**File:** `src/components/Dashboard/AddGuestModal.tsx` (locked — requires approval)

### Root cause
The DialogContent already has `px-4 sm:px-10` and a proper `max-lg:w-[calc(100%-3rem)]` width clamp (matches Create Event modal). The horizontal scroll is caused by the **Members section header** (lines 1214–1231):

- The "Add your partner to make you a couple" / "Add another member to this family" button sits inside a `flex items-center justify-between` row next to the "Members (N)" pill.
- shadcn `Button` defaults to `whitespace-nowrap`, so the long label forces the row wider than the viewport on mobile (~358px).
- This is the only element that breaks the container; everything else (inputs, segmented toggle, footer) already respects `w-full`.

### Changes (mobile-only, all gated with `max-lg:` / `lg:`)

1. **Members header row** (line 1215)
   - Desktop: keep `flex items-center justify-between`.
   - Mobile: stack vertically — `max-lg:flex-col max-lg:items-stretch max-lg:gap-2`.

2. **"Add partner / member" button** (lines 1220–1230)
   - Add `max-lg:w-full max-lg:whitespace-normal max-lg:h-auto max-lg:py-2 max-lg:text-center max-lg:leading-snug`.
   - Allows the long label to wrap to 2 lines instead of pushing the modal wide.

3. **Members pill** (line 1216)
   - Add `max-lg:self-start` so it sits left-aligned above the full-width button when stacked.

4. **DialogContent safety net** (line 910)
   - Append `overflow-x-hidden` to guarantee no child can ever introduce a horizontal scrollbar.

5. **Inline "Add Member" sub-form** (line 1235)
   - Change padding from `p-4` to `p-4 max-lg:p-3` so the nested cream card doesn't crowd the modal edges on small screens.

### Out of scope (do NOT change)
- Field/input styling, colors, rounded shapes
- Segmented Individual/Couple/Family toggle (already `w-full`)
- Footer Save/Cancel (already correct per locked mobile rules)
- Desktop layout
- Any other modal or page

### Verification
After edit, open `/dashboard?tab=guest-list` on a 390px viewport, click **Add Guest**, switch between Individual / Couple / Family. Confirm: no horizontal scroll, button label wraps cleanly, all inputs sit flush with 16px side padding matching Create Event modal.

### Approval needed
`AddGuestModal.tsx` is part of the locked Guest List feature. Please approve the edit so I can apply the 5 small mobile-only class changes above.