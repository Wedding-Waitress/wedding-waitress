## Create Event Modal — Final UI Refinements

Small, targeted polish pass. No layout/structure changes.

### 1. Title size
`src/components/Dashboard/EventCreateModal.tsx` line 257 — `DialogTitle`:
- From: `text-2xl sm:text-3xl`
- To: `text-xl lg:text-2xl`

### 2. Mobile button layout (side by side, 50/50)
Already mostly correct from previous pass. Verify the footer block still uses `flex flex-row gap-3 w-full` with each button `flex-1 lg:flex-none` and `h-11`. No change needed if intact.

### 3. Toggle switch refinement
`src/components/ui/switch.tsx` — ensure thumb centers cleanly inside the bordered track:
- Root: `h-6 w-11 border-2 rounded-full` (already correct).
- Thumb: `h-4 w-4 rounded-full bg-white`, `data-[state=unchecked]:translate-x-0.5`, `data-[state=checked]:translate-x-5`. Already in place from last pass — verify and keep.

### 4. Close button (perfect center)
`src/components/ui/dialog.tsx` close button — already `flex h-10 w-10 aspect-square items-center justify-center rounded-full p-0`. Verify; no further change needed.

### 5. Input consistency
`EventCreateModal.tsx` `getInputClass` (line ~107) already includes `px-4 truncate w-full text-sm`. Also confirm the top-level event-name `Input` (line 263) keeps `w-full px-4 truncate` and uses `text-sm` (currently inherits default — add `text-sm` explicitly).

### 6. Event Type segmented control
Already converted to `grid grid-cols-2 gap-1 bg-muted border border-border rounded-full p-1 w-full max-w-md` with equal-width buttons (active = green, inactive = transparent). Verify; no change needed.

### Files touched
- `src/components/Dashboard/EventCreateModal.tsx` — title size class; add `text-sm` to event-name input.
- `src/components/ui/switch.tsx` — verify only.
- `src/components/ui/dialog.tsx` — verify only.

### Out of scope
Anything outside the Create Event modal and the two shared primitives.
