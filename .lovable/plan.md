## Create Event Modal — UI Polish Pass

Scope: `src/components/Dashboard/EventCreateModal.tsx`, with two minimal global tweaks in `src/components/ui/dialog.tsx` and `src/components/ui/switch.tsx`. No functional/logic changes.

### 1. Header title size
- In `EventCreateModal.tsx` line 257: bump `DialogTitle` from `text-xl sm:text-2xl` back to `text-2xl sm:text-3xl` (its previous larger size). Keep current alignment rules (`text-center lg:text-left`).

### 2. Close button — perfect circle (global)
- In `src/components/ui/dialog.tsx` (close button line ~88): add `aspect-square shrink-0 p-0` and ensure `h-10 w-10 rounded-full` plus `flex items-center justify-center`. Remove any padding/leading that could deform it on mobile. This applies globally to all modals.

### 3. Toggle switch — proper pill switch (global)
- In `src/components/ui/switch.tsx`: keep horizontal pill (`h-6 w-11 rounded-full`), but ensure:
  - Root has `items-center` (already present) and explicit `relative`.
  - Thumb wrapper uses `block h-5 w-5 rounded-full` with `translate-x-0` (off) / `translate-x-5` (on) — already correct, but verify spacing so the knob is vertically centered. Add `data-[state=unchecked]:bg-muted` fallback and keep green when checked.
- Confirms Ceremony + Reception toggles (already use `<Switch>`) render as a proper pill switch on every viewport.

### 4. Input text overflow
- In `EventCreateModal.tsx`, ensure event-name `Input` (line 263) gets `px-4 truncate` and confirm `w-full`.
- Audit all other `Input` fields and `EventNameCombobox` placeholders for `px-4` and `truncate` via the shared `getInputClass` helper (line 107): append `px-4 truncate` to the base class so every input in the modal is consistent.

### 5. Footer buttons — side by side, equal width
- Replace the `DialogFooter` block (lines 552–567):
  - Use a `div` with `flex flex-row gap-3 w-full pt-2 border-t` (overrides default `DialogFooter` which stacks reversed on mobile).
  - Order: Create Event (green, left) then Cancel (red, right), each `flex-1` with matching `h-11 rounded-full` for equal height/radius.
  - On `lg:` keep them right-aligned (`lg:justify-end lg:flex-none` and remove `flex-1` at `lg:`) so desktop layout is preserved.

### 6. Event Type segmented control — balanced
- Replace the pill container in lines 417–440:
  - Wrap in `grid grid-cols-2 gap-1 bg-muted border border-border rounded-full p-1 w-full` (or `max-w-md` to avoid stretching too wide on desktop).
  - Each button: `h-9 rounded-full text-xs font-medium flex items-center justify-center transition-all`.
  - Active: `bg-green-500 text-white shadow-sm`. Inactive: `bg-transparent text-muted-foreground hover:bg-muted-foreground/10`.
- Apply identical structure if/when a Ceremony event-type toggle is added (currently only Reception has one — no change needed for Ceremony).

### 7. Consistency
- All changes apply on mobile, tablet, and desktop. Desktop layout (3-column grids, right-aligned footer on `lg:`) is preserved.
- No color/spacing/functionality changes outside the items above.

### Files touched
- `src/components/Dashboard/EventCreateModal.tsx` — header title size, input class (px-4/truncate), footer layout, event-type segmented control.
- `src/components/ui/dialog.tsx` — close button perfect circle.
- `src/components/ui/switch.tsx` — verify/normalize pill switch styling.

### Out of scope
Any changes outside the Create Event modal and the two shared primitives above.
