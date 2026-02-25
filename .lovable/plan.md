
# Fix Button Styling in Guest Live View

## Changes

### File: `src/pages/GuestLookup.tsx`

### 1. Add purple border to Table View tab (and Update Your Details tab when inactive)
Currently the two TabsTrigger buttons have `border-transparent` when inactive, making them appear borderless. Change to `border-primary` so they match the four feature buttons above.

- **Lines 648, 662**: Change `border-transparent` to `border-primary` in the inactive state styling for both TabsTriggers.

### 2. Reduce height of all buttons by decreasing vertical padding
All six feature/tab buttons currently use `py-2.5`. Reduce to `py-1.5` for a thinner/shorter appearance.

- **Lines 610, 619, 628, 637**: Change `py-2.5` to `py-1.5` on the four feature buttons.
- **Lines 648, 662**: Change `py-2.5` to `py-1.5` on the two TabsTrigger buttons.

### 3. Reduce Share button height slightly
The Share button (line 762) already uses `py-1.5` so it should be fine, but will verify consistency.

### Summary of styling after changes
All buttons will have:
- `py-1.5 px-3 rounded-full border-2 border-primary` (thinner height, purple border)
- Active tab state keeps green border override via `data-[state=active]:border-green-500`
