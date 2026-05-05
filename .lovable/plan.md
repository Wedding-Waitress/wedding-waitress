## Goal
Center and properly fit the A4 preview on mobile (<768px) in the Individual Table Charts page. Tablet (768–1023px) and desktop (≥1024px) stay completely unchanged.

## File
- `src/components/Dashboard/IndividualTableChart/IndividualTableChartPreview.tsx`

## Changes (lines ~416–432 only)

The existing `useEffect`/`compute()` already calculates `tabletScale = containerWidth / 794` whenever `w < 1024`, so for mobile we simply reuse that value. No changes to the effect.

Update the three wrapper divs around the A4 sheet:

1. **Outer container** (currently `<div className="flex justify-center" style={isTabletRange ? ... : undefined}>`):
   Apply `{ overflowX: 'hidden', width: '100%' }` when `isTabletRange` OR when on mobile (`isTablet && !isTabletRange`).

2. **Middle wrapper** (`tabletWrapperRef`): when on mobile (`isTablet && !isTabletRange && tabletScale < 1`), apply:
   - `height: calc(297mm * ${tabletScale})`
   - `overflow: hidden`
   - `display: flex`
   - `justifyContent: center`
   - `width: 100%`
   Tablet branch (`isTabletRange` → fixed 0.75) preserved as-is.

3. **Inner transform wrapper**: existing mobile branch `{ transform: scale(${tabletScale}), transformOrigin: 'top center', width: '210mm', margin: '0 auto' }` already matches the spec — no change needed.

## Guardrails
- Tablet branch (`isTabletRange`) untouched.
- Desktop path (no `isTablet*`) untouched — no inline styles.
- No changes to PDF export, header, guest list, or any other component.