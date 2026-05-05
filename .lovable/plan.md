## Scope

Fix tablet + mobile responsiveness of the **Name Place Cards** page only. Desktop layout (≥`lg`) and all export logic (PDF/DOCX/300 DPI engine) remain untouched.

Note: `PlaceCardsPage.tsx` and `PlaceCardPreview.tsx` carry a "PRODUCTION-READY — DO NOT MODIFY" header. Changes here are scoped strictly to responsive Tailwind classes and an A4 scaling wrapper — no logic, no measurements, no export code touched.

## Files to edit

1. `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`
2. `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` (only the on-screen wrapper around the A4 sheet — the A4 sheet itself stays exactly 210mm × 297mm)

## Changes

### 1. Header card (PlaceCardsPage.tsx)

- Stats + Card Dimensions row (line 269): change `flex flex-wrap items-start justify-between gap-4` → keep flex-wrap behaviour but ensure each child is `w-full lg:flex-1` / `w-full lg:w-auto` so they stack cleanly on tablet/mobile and never clip.
- Choose Event + Table + Export Controls row (line 317): replace the single `flex items-center justify-between gap-8 flex-nowrap` with a responsive container:
  - Mobile/tablet: `flex flex-col gap-4`, dropdown labels stack above selects (`flex-col items-start gap-2`), selects `w-full`.
  - Desktop (`lg:`): restore current `lg:flex-row lg:items-center lg:justify-between lg:flex-nowrap lg:gap-8` exactly as today.
- Inner "Choose Event" + "Table" group: `flex flex-col gap-4 w-full lg:flex-row lg:items-center lg:gap-8 lg:w-auto`. Each select wrapper becomes `w-full lg:w-auto`; `SelectTrigger` already has `w-full sm:w-[300px]` — change to `w-full lg:w-[300px]` so tablet stays full-width.
- Export Controls box: `w-full lg:w-auto`. Inner button row `flex flex-col sm:flex-row gap-2`; each button gets `w-full sm:w-auto justify-center`.

### 2. Two-column body (PlaceCardsPage.tsx, line 435)

Already `grid-cols-1 lg:grid-cols-7`, so it stacks below `lg`. No change needed — verify customizer (`lg:col-span-2`) and preview (`lg:col-span-5`) inherit `w-full` (they do via grid). Add `min-w-0` to both column wrappers to prevent overflow from preview pushing layout.

### 3. Preview overflow (PlaceCardPreview.tsx)

- Line 707 wrapper `<div className="flex justify-center relative" style={{ marginLeft: '40px' }}>`:
  - Move `marginLeft: 40px` into a `lg:ml-10` class and drop the inline style on mobile (so the A4 isn't pushed off-screen).
  - Wrap the A4 sheet (the `width:210mm; height:297mm` div on line 740) in an outer container `w-full overflow-x-hidden flex justify-center` with a CSS-variable-driven scale:
    ```tsx
    <div className="w-full overflow-hidden flex justify-center">
      <div
        className="origin-top"
        style={{
          transform: 'var(--pc-preview-scale, none)',
          width: '210mm',
        }}
      >
        {/* existing 210mm × 297mm sheet unchanged */}
      </div>
    </div>
    ```
  - Add a small `useEffect` (or `ResizeObserver`) on the outer wrapper that sets `--pc-preview-scale: scale(<containerWidth / 210mm-in-px>)` whenever container width < the px equivalent of 210mm (≈794 px). On wider viewports the variable stays `none`. The scaled wrapper also gets a matching `height` reservation (`297mm * scale`) so layout below isn't broken.
  - This preserves the A4 sheet's exact mm geometry (export still uses original DOM) and only visually shrinks the on-screen preview to fit phones/tablets.
- Top pagination row (line 682): add `flex-wrap` so Previous / "Page X of Y" / Next wrap cleanly on narrow screens, keep `justify-center`.

### 4. Customizer (already responsive grid?)

Quick check: keep `PlaceCardCustomizer` untouched unless it visibly overflows — its parent column is `min-w-0 w-full` after step 2, which is enough. If internal tab triggers overflow on mobile, add `flex-wrap` to the `TabsList` only (no other changes).

## Out of scope / explicitly NOT changed

- A4 dimensions (210×297mm), card dimensions (105×99mm), fold line, mm coordinates.
- PDF/DOCX exporters and 300 DPI math.
- Desktop appearance at `lg` and above (verified by guarding every change with `lg:` prefix).
- Any other dashboard page.

## Verification

After implementation, open `/dashboard?tab=place-cards` at 375px, 768px and 1554px:
- 375 px: stats box + dimensions box stack; selects stack full-width; Export buttons stack full-width; A4 preview shrinks to fit with no horizontal scroll; pagination centered.
- 768 px: same stacking; preview scaled to container width; customizer above preview.
- 1554 px: pixel-identical to current desktop screenshot.
