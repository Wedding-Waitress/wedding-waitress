## Goal
Eliminate every purple element from the **Floor Plan** page and its PDF export, replacing with brand brown `#967A59` (RGB `150, 122, 89`) — matching the Individual Table Chart PDF and the rest of the app. Also swap the purple footer logo for the brown one.

> Note: Both files are marked "PRODUCTION LOCKED" in their headers. This plan proceeds because you have explicitly authorized the color/logo correction. No layout, sizing, geometry, fonts, spacing, or logic will change — colors and the logo path only.

---

## 1. On-screen fix — `src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanVisual.tsx`

Currently the "Bride's Walkway - Aisle" text is hardcoded to purple `hsl(262, 83%, 58%)` (line 429).

- Change `color: 'hsl(262, 83%, 58%)'` → `color: '#967A59'` so it matches the brown circular borders around the couple names (which already use `border-primary` = brown).

No other on-screen color changes needed — all other Floor Plan UI elements already use `border-primary` / `text-primary` tokens which resolve to brand brown.

---

## 2. PDF export fix — `src/lib/ceremonyFloorPlanPdfExporter.ts`

The exporter currently uses two purple values:
- `(109, 40, 217)` — title + divider
- `(114, 72, 230)` — section labels, seat borders, couple circles, walkway text
- `(240, 235, 250)` — light-purple seat fill
- `(196, 181, 253)` — light-purple unassigned seat border

Replace **all** with brand brown system:
- Brown primary `(150, 122, 89)` → titles, dividers, section labels, seat borders, couple circles, walkway text
- Soft brown tint `(245, 240, 232)` → seat fill (cream/beige, matches the dashboard cream surfaces)
- Light brown border `(211, 196, 174)` → unassigned seat outline

Specific line-level replacements (colors only, geometry untouched):

| Line(s) | Current | New |
|---|---|---|
| 81 | `setTextColor(109, 40, 217)` (event name) | `setTextColor(150, 122, 89)` |
| 124 | `setDrawColor(109, 40, 217)` (divider) | `setDrawColor(150, 122, 89)` |
| 219 | `setDrawColor(114, 72, 230)` (bridal box border w/ name) | `setDrawColor(150, 122, 89)` |
| 253 | `setTextColor(114, 72, 230)` (bridal party labels) | `setTextColor(150, 122, 89)` |
| 291 | `setDrawColor(114, 72, 230)` (left couple circle) | `setDrawColor(150, 122, 89)` |
| 310 | `setDrawColor(114, 72, 230)` (right couple circle) | `setDrawColor(150, 122, 89)` |
| 332 | `setTextColor(114, 72, 230)` (side labels: Groom's/Bride's Family) | `setTextColor(150, 122, 89)` |
| 374, 377, 414, 417 | `setFillColor(240, 235, 250)` (seat fill) | `setFillColor(245, 240, 232)` |
| 375, 415 | `setDrawColor(114, 72, 230)` (assigned seat border) | `setDrawColor(150, 122, 89)` |
| 378, 418 | `setDrawColor(196, 181, 253)` (unassigned border) | `setDrawColor(211, 196, 174)` |
| 480 | `setTextColor(114, 72, 230)` (walkway text) | `setTextColor(150, 122, 89)` |

Comments referencing "Purple" / "Light purple" will be updated to "Brown" / "Soft brown" so future readers aren't misled.

---

## 3. Footer logo swap — same file, line 505

- `logoImg.src = '/wedding-waitress-new-logo.png'` → `logoImg.src = '/wedding-waitress-logo-brown.png'`

This is the same brown asset already used by the Individual Table Chart PDF (confirmed correct in the previous logo fix). Existing scaling logic preserves aspect ratio at 12 mm height, centered — so it stays sharp and properly sized.

---

## 4. What is NOT changing

- No geometry, sizes, spacing, fonts, page layout, totals, labels, or logic
- No other pages, components, or PDF exporters touched
- No design tokens or global theme changes
- "PRODUCTION LOCKED" header comments preserved (only color literals + logo path change)

---

## 5. Verification

After implementation:
1. Open `/dashboard?tab=floor-plan` → confirm "Bride's Walkway - Aisle" text is brown.
2. Click **Download PDF** → open the file and confirm: title, divider, all section headings, seat outlines, couple circles, walkway text, and footer logo are all brand brown — zero purple anywhere.
3. Visual parity check against the Individual Table Chart PDF.