

# Comprehensive Mobile-Friendly Fix Across All Pages

## Problem Summary

After reviewing every page and component, I found **hardcoded widths**, **non-wrapping flex rows**, and **overflow-causing layouts** that break on mobile screens. The issues fall into clear categories.

---

## Category 1: Hardcoded `w-[300px]` on SelectTriggers (13 files, ~20 instances)

Many event/table selector dropdowns use `w-[300px]` without a responsive prefix, causing them to overflow on screens narrower than 300px + padding.

**Fix:** Change all `w-[300px]` to `w-full sm:w-[300px]` (some already have this -- those are fine).

### Files to update:
| File | Lines |
|------|-------|
| `src/components/Dashboard/StandardEventSelector.tsx` | line 31 |
| `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` | lines 324, 357 |
| `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx` | line 448 |
| `src/components/Dashboard/TableChart/TableSeatingChartPage.tsx` | line 186 |
| `src/components/Dashboard/GuestListTable.tsx` | line 1360 |
| `src/components/Dashboard/Signage/SignagePage.tsx` | line 168 |
| `src/components/Dashboard/Kiosk/KioskSetup.tsx` | line 145 |
| `src/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage.tsx` | lines 329, 361 |
| `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` | (search for w-[300px]) |

---

## Category 2: Non-wrapping flex rows that overflow on mobile

### KioskSetup.tsx (line 140)
- `flex items-center space-x-4` for event selector label + dropdown -- does not wrap on mobile
- **Fix:** Change to `flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4` and remove `space-x-4`

### IndividualTableSeatingChartPage.tsx (line 313)
- `flex items-center gap-8 flex-wrap` -- gap-8 is too large on mobile
- **Fix:** Change to `flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-wrap`

### IndividualTableSeatingChartPage.tsx (lines 315, 352)
- `flex items-center gap-4` for label + select rows
- **Fix:** Change to `flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full`

### GuestListTable.tsx (line 1622)
- Search input has `w-[180px] sm:w-[200px]` -- acceptable but the parent row with category pills can overflow
- **Fix:** Ensure parent flex container at line 1615 uses `flex-wrap` (it already does, so this is OK)

### Dashboard.tsx Table Setup section (lines 471, 409)
- `flex items-center justify-between gap-3` -- on mobile the "Choose Event" label + dropdown + button all fight for space
- **Fix:** Change to `flex flex-col sm:flex-row sm:items-center justify-between gap-3`

---

## Category 3: Landing Page mobile issues

### Landing.tsx (line 153)
- `h1` uses `text-5xl` on all screens -- too large on mobile
- **Fix:** Change to `text-3xl sm:text-4xl lg:text-5xl xl:text-6xl`

### Landing.tsx (line 336)
- Heading `text-4xl` without responsive prefix
- **Fix:** Change to `text-2xl sm:text-3xl md:text-4xl`

### Landing.tsx (line 396-402)
- Footer CTA section uses `text-4xl` and `text-xl` without responsive prefixes, and `size="xl"` button
- **Fix:** Add responsive text sizing

### Landing.tsx (line 149)
- Badge with `px-4 md:px-8 lg:px-16` -- the large padding causes overflow on narrow screens, but px-4 on mobile is fine

---

## Category 4: Dashboard Table Setup page overflow

### Dashboard.tsx (lines 449-467)
- Table Setup description list uses `MapPin w-16 h-16` icon which takes too much horizontal space on mobile
- **Fix:** Make icon `w-10 h-10 sm:w-16 sm:h-16`

### Dashboard.tsx Table Setup description (lines 454-466)
- The `flex items-start gap-3` row with the large icon + description text can overflow
- Already uses `flex-1` for text which is correct

---

## Category 5: Countdown circles overflow

### CountdownBar.tsx (line 153)
- Countdown circles are `w-24 h-24 md:w-32 md:h-32` -- on very narrow screens 4 circles at 96px + gaps may overflow
- **Fix:** Change to `w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32` and reduce gap from `gap-6` to `gap-3 sm:gap-6`

---

## Category 6: Header mobile button position

### Header.tsx (line 93)
- Mobile menu button uses `absolute -right-2` -- negative positioning can cause horizontal overflow
- **Fix:** Change to `absolute right-0`

---

## Summary of All Files to Edit

| # | File | Type of Fix |
|---|------|-------------|
| 1 | `src/components/Dashboard/StandardEventSelector.tsx` | `w-[300px]` to responsive |
| 2 | `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx` | `w-[300px]` to responsive (2 places) |
| 3 | `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx` | `w-[300px]` to responsive |
| 4 | `src/components/Dashboard/TableChart/TableSeatingChartPage.tsx` | `w-[300px]` to responsive |
| 5 | `src/components/Dashboard/GuestListTable.tsx` | `w-[300px]` to responsive |
| 6 | `src/components/Dashboard/Signage/SignagePage.tsx` | `w-[300px]` to responsive |
| 7 | `src/components/Dashboard/Kiosk/KioskSetup.tsx` | `w-[300px]` to responsive + flex-wrap fix |
| 8 | `src/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage.tsx` | `w-[300px]` to responsive (2) + flex-wrap |
| 9 | `src/pages/Landing.tsx` | Responsive text sizes, heading overflow |
| 10 | `src/pages/Dashboard.tsx` | Flex-wrap on table setup event selector rows |
| 11 | `src/components/Dashboard/CountdownBar.tsx` | Smaller circles on mobile |
| 12 | `src/components/Layout/Header.tsx` | Fix `-right-2` to `right-0` |
| 13 | `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` | `w-[300px]` to responsive (if present) |

---

## Technical Notes

- All changes are CSS/Tailwind class-only -- no logic changes
- Locked files (GuestListTable, EventsTable, TableCard, PlaceCards export logic) -- only CSS class changes to fix mobile overflow, no functional changes
- The guest list data table intentionally scrolls horizontally -- this is correct UX for wide tables
- These fixes target the root causes of "off the page" elements: hardcoded widths and non-wrapping flex containers

