
# Change All Dashboard Page Headers to Black

## What's Changing

All main page header titles across the dashboard will be changed from purple (`text-[#7248e6]` or `text-primary`) to black (`text-foreground`), matching the Running Sheet page style. The font size and weight will be standardized to `text-2xl font-medium` across all pages.

## Pages Affected

| Page | File | Current Color |
|------|------|--------------|
| Kiosk Live View | KioskSetup.tsx | Purple |
| Full Seating Chart | FullSeatingChartPage.tsx | Purple |
| Kitchen Dietary Requirements | KitchenDietaryChart.tsx | Purple |
| Floor Plan | FloorPlanPage.tsx | Purple |
| Individual Table Seating Chart | IndividualTableSeatingChartPage.tsx | Purple |
| Table Name Place Cards | PlaceCardsPage.tsx | Purple |
| QR Code Seating Chart | QRCodeSeatingChart.tsx | Purple |
| Guest List | GuestListTable.tsx | Purple |
| Table Setup | Dashboard.tsx | Purple |
| My Events | EventsTable.tsx | Purple |

## Technical Details

For each file, replace `text-[#7248e6]` or `text-primary` on the main page header with `text-foreground`. Ensure all use `text-2xl font-medium` for consistent sizing.

### Specific changes per file:

1. **KioskSetup.tsx** (line 119): `text-[#7248e6]` -> `text-foreground`
2. **FullSeatingChartPage.tsx** (line 205): `text-[#7248e6]` -> `text-foreground`
3. **KitchenDietaryChart.tsx** (line 437): `text-[#7248e6]` -> `text-foreground`
4. **FloorPlanPage.tsx** (line 88): `text-[#7248e6]` -> `text-foreground`, standardize to `text-2xl font-medium`
5. **IndividualTableSeatingChartPage.tsx** (line 270): `text-[#7248e6]` -> `text-foreground`
6. **PlaceCardsPage.tsx** (line 259): `text-primary` -> `text-foreground`
7. **QRCodeSeatingChart.tsx** (line 95): `text-[#7248e6]` -> `text-foreground`
8. **GuestListTable.tsx** (line 1396): `text-primary` -> `text-foreground`, standardize to `text-2xl font-medium`
9. **Dashboard.tsx** (line 454): `text-[#7248e6]` -> `text-foreground` (Table Setup header)
10. **EventsTable.tsx** (line 233): `text-[#7248e6]` -> `text-foreground` (My Events header)

Only the main page title heading in each file is changed. No other elements (sub-headers, icons, descriptions, settings panels) are modified.
