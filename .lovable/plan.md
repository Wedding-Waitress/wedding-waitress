

# Fix Missing Logo on Seating Chart Public View

## Problem
The footer on the shared seating chart page (`/seating-chart/:token`) references `/ww-logo.png`, which does not exist. The correct logo file is `/wedding-waitress-logo.png` (used by other public views like the DJ/MC page).

## Fix
Update the footer in `src/pages/SeatingChartPublicView.tsx` (lines 154-165):

- Change the `img src` from `/ww-logo.png` to `/wedding-waitress-logo.png`
- Make both the logo image and the "Powered by Wedding Waitress" text link to `https://www.weddingwaitress.com` (the logo link is already there, just needs the correct image path)

This matches the pattern used in `DJMCPublicView.tsx`.

## File to Modify
- `src/pages/SeatingChartPublicView.tsx` -- fix logo `src` path in the footer section

