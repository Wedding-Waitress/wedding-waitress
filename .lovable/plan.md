

# Simplified Share for Full Seating Chart

## What's changing
The shared public view page will only offer a single "Download PDF" button that downloads all pages. There will be no "single page vs all pages" choice for recipients.

## Technical Details

Everything from the previously approved plan stays the same except:

**Public View Page (`SeatingChartPublicView.tsx`)**
- Only one green tablet-style button: "Download PDF"
- This button calls `exportFullSeatingChartToPdf` with the full guest list (all pages)
- No single-page option presented to recipients

**Dashboard Export Controls (`FullSeatingChartPage.tsx`)**
- The "Share with..." button in Export Controls opens the share modal (no sub-menu, no choice between single/all)
- The shared link always gives recipients the full seating chart

Everything else remains identical: database table, token generation, share modal with Create/Manage tabs, RLS policies, URL utility, and route registration.

## Files to Create
- `src/hooks/useSeatingChartShare.ts`
- `src/components/Dashboard/FullSeatingChart/SeatingChartShareModal.tsx`
- `src/pages/SeatingChartPublicView.tsx`

## Files to Modify
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` -- add share button + modal
- `src/lib/urlUtils.ts` -- add `buildSeatingChartUrl`
- `src/App.tsx` -- add public route
- Database: new table, token functions, RLS policies

