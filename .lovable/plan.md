## Why the logo is still purple

The previous change updated the code references to `/wedding-waitress-pdf-footer-logo.png` — but **that file in `public/` is still the old purple logo**. The genuinely brown asset is `/wedding-waitress-logo-brown.png` (verified visually).

So the on-screen preview, the Single Page PDF, and the All Pages PDF are all loading a purple PNG even though the path was "updated".

## Fix (3 one-line changes, scoped only to Individual Table Charts)

Repoint all three Individual Table Chart references from `/wedding-waitress-pdf-footer-logo.png` → `/wedding-waitress-logo-brown.png`:

1. **`src/components/Dashboard/IndividualTableChart/IndividualTableChartPreview.tsx`** (line 21)
   - On-screen A4 preview logo at the bottom of the page.

2. **`src/lib/individualTableChartEngine.ts`** (line 20)
   - Used by both **Download Single Page PDF** and **Download All Pages PDF** (shared `weddingWaitressLogoFull` constant in the SVG-to-canvas engine).

3. **`src/lib/individualTableChartDocxExporter.ts`** (line 65)
   - DOCX export footer logo (kept consistent so all exports match).

## Out of scope (will not touch)

- No layout, sizing, positioning, typography, or functionality changes.
- No changes to other pages (Full Seating Chart, Place Cards, Invitations, etc.) — they continue using whatever asset they currently reference.
- The old purple PNG file is left in place to avoid breaking any other consumer; we simply stop pointing the Individual Table Charts code at it.

## Confirmation I will give you after the fix

Once applied, I will confirm explicitly that the brown logo is now used in all three places on the Individual Table Charts page:
1. ✅ On-screen A4 preview (bottom of page)
2. ✅ Download Single Page PDF
3. ✅ Download All Pages PDF