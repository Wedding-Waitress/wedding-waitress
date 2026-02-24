

# Fix Footer Logo on Seating Chart Public View

## Problem
The footer on the shared seating chart page shows the wrong (small) logo. It should display the full branded Wedding Waitress logo, matching the Running Sheet public view.

## Fix
Update the footer in `src/pages/SeatingChartPublicView.tsx`:

- Change `img src` from `/wedding-waitress-logo.png` to `/wedding-waitress-share-logo.png` (the full branded logo already in the project, used by `RunningSheetPublicView.tsx`)
- Increase logo height from `h-8` to `h-10` to match the Running Sheet
- Ensure both the logo and "Powered by Wedding Waitress" text remain clickable links to `https://www.weddingwaitress.com`

## File to Modify
- `src/pages/SeatingChartPublicView.tsx` -- update logo src and size in the footer

