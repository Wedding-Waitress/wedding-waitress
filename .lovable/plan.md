## Print & Export Studio — UX hierarchy polish

Scope: `src/components/Dashboard/Signage/SignagePage.tsx`, lines ~344-396 only. Pure visual/layout polish. No state, export, PDF, orientation, or designer changes.

### 1. New section heading row above print-size cards

Replace the current single line (`Choose Print Size` + right-aligned "Portrait orientation • Australian standard sizes") with a richer two-tier header:

- **Wrapper:** `flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between`
- **Left block:**
  - H4 — `Professional Wedding Print Sizes` — `text-base font-semibold text-primary`
  - Subline — `Choose the perfect format for your foyer signs, table QR cards, upload stations, and wedding keepsakes.` — `text-sm text-muted-foreground`
- **Right block (desktop only — `hidden lg:inline-flex`):**
  - Pill — `300 DPI • Print-Shop Ready` — `rounded-full border border-primary/20 bg-[hsl(var(--primary)/0.06)] px-3 py-1 text-[11px] tracking-wide text-primary whitespace-nowrap`

Then a secondary tiny label row above the grid: `Choose Print Size` as `text-xs uppercase tracking-wider text-muted-foreground font-medium` (kept so the grid still has a label).

### 2. Print-size card hierarchy

Per card:
- Size label (A0/A1…): `text-sm font-semibold` (active still tinted primary)
- Dimensions (`size.dims`): `text-[11px] text-muted-foreground/80`
- "Best for…" helper (`size.best`): `text-[11px] text-foreground/70 leading-snug` (slightly darker than current `muted-foreground/90`)

### 3. Recommended A1 badge upgrade

Replace current subtle badge with:
- Text: `⭐ MOST POPULAR`
- Classes: `rounded-full uppercase text-[10px] font-semibold tracking-wider px-2 py-0.5 bg-[hsl(var(--primary)/0.14)] text-primary border border-primary/25 whitespace-nowrap`
- Add `mt-0.5` and ensure header row uses `gap-2` for cleaner spacing from the size title.

### 4. Hover/selection animation polish

All cards add: `hover:-translate-y-[1px] hover:shadow-md transition-all duration-200` (replaces existing `transition-all`).

Active card adds `shadow-md` (slightly stronger than current `shadow-soft`); border/ring/bg logic unchanged.

### 5. Spacing below cards

- Increase the studio panel inner gap from `gap-5` to `gap-6` on the wrapping container.
- Increase the size-section internal `gap-3` between the heading block, grid, and the spacing before the download button — wrap download block with `pt-2` or change parent gap to `gap-7`.
- Increase the gap inside the download block (`gap-1.5` → `gap-2`) so the helper hint breathes.

### Out of scope (untouched)
- `PRINT_SIZES` data, `printSize` state, `handleDownloadPDF`, button enable logic
- Premium info bar below the panel
- Designer/preview, orientation, PDF engine
- Any other tab/page