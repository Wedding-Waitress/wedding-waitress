

## Roll Out Dark Gray (#1D1D1F) App-Wide via CSS Variables

**What**: Instead of adding classes to every page and modal one by one, we change the global CSS color variables in `src/index.css`. This instantly applies the Apple dark gray to every page, modal, and component across Wedding Waitress — with zero changes to individual component files.

### Approach

The app uses CSS variables (`--foreground`, `--card-foreground`, etc.) set to `224 71% 4%` (near-black #030712). By updating these variables to the HSL equivalent of `#1D1D1F` (≈ `240 3% 12%`) and updating `--muted-foreground` to `#6E6E73` (≈ `240 2% 44%`), every element that references these variables automatically gets the new color.

Then we clean up the trial-scoped classes (`.running-sheet-dark-gray`, `.ww-dark-gray-form`) since they're no longer needed.

### Single file to edit

**`src/index.css`**:

1. Update these CSS variables in `:root`:
   - `--foreground: 240 3% 12%` (was `224 71% 4%`) → #1D1D1F
   - `--card-foreground: 240 3% 12%` (was `224 71% 4%`)
   - `--secondary-foreground: 240 3% 12%` (was `224 71% 4%`)
   - `--popover-foreground: 240 3% 12%` (was `224 71% 4%`)
   - `--muted-foreground: 240 2% 44%` (was `224 71% 4%`) → #6E6E73

2. Add a global placeholder rule:
   ```css
   input::placeholder, textarea::placeholder, [data-placeholder] {
     color: #6E6E73 !important;
   }
   ```

3. Remove the now-redundant trial classes (`.running-sheet-dark-gray` and `.ww-dark-gray-form` blocks, lines 693–716)

**`src/components/Dashboard/RunningSheet/RunningSheetPage.tsx`** — Remove `running-sheet-dark-gray` class from the root div (no longer needed).

**`src/components/Dashboard/AddGuestModal.tsx`** — Remove `ww-dark-gray-form` class from DialogContent (no longer needed).

### What changes visually
- ALL text across every page and modal → #1D1D1F (Apple dark gray)
- ALL placeholder text in inputs/textareas → #6E6E73 (Apple secondary gray)
- Purple (`text-primary`), red (`text-destructive`), green indicators → unchanged
- PDF exports → unchanged (they use their own rendering, not CSS variables)

### What stays the same
- All layout, spacing, functionality
- Purple branding colors
- PDF/DOCX export styling
- Landing page gradients and hero sections

