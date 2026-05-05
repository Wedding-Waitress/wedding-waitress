## Goal
On the Individual Table Charts page, the A4 preview is cut off on the right and not centred on tablet (768–1023px). Fix it with a tablet-only fixed `scale(0.75)`, centered, with `overflow-x: hidden`. Desktop (≥1024px) stays pixel-identical. Mobile (<768px) keeps its existing dynamic ResizeObserver scaling.

## File
- `src/components/Dashboard/IndividualTableChart/IndividualTableChartPreview.tsx`

## Changes (scoped to lines ~386–422)

1. Track a separate `isTabletRange` state (true only when `768 ≤ width < 1024`) alongside the existing `isTablet`/`tabletScale` (which continues handling mobile).
   - In the existing `compute()` inside the `useEffect`, also set `isTabletRange = w >= 768 && w < 1024`.

2. Outer `<div className="flex justify-center">` (line 414): when on tablet range, also apply `overflow-x: hidden` and `width: 100%`.

3. Wrapper div at line 415 (`tabletWrapperRef`): when `isTabletRange` is true, override its inline style to:
   - `height: calc(297mm * 0.75)`
   - `overflow: hidden`
   - `display: flex`
   - `justifyContent: center`
   - `width: 100%`
   Mobile branch (existing dynamic `tabletScale`) is preserved unchanged via an `else if`.

4. Inner div at line 420 (transform wrapper): when `isTabletRange`, apply:
   - `transform: scale(0.75)`
   - `transformOrigin: top center`
   - `width: 210mm`
   - `margin: 0 auto`
   Mobile dynamic-scale branch preserved as-is via `else if`.

5. Desktop path (no `isTablet*` true): no style applied — identical to current.

## Guardrails
- No changes to header text wrapping, guest list columns, mobile scaling logic, PDF export, or any other component.
- Pure additive conditional: tablet branch added; mobile branch untouched; desktop path untouched.