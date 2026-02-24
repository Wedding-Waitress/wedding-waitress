

# Consistent Green Button Styling Across All Dashboard Pages

## Summary
Apply the Running Sheet's green-bordered button style (`h-7 px-2.5 text-xs border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50`) to all Download PDF buttons across 7 pages, update the Kiosk buttons, and change the QR Code "Open Live View" button to solid green.

## Changes by Page

### 1. DJ-MC Questionnaire (`DJMCQuestionnairePage.tsx`, line 185-198)
- Change "Download entire questionnaire PDF" button from `variant="default" size="sm"` (solid purple) to the green-bordered tablet style matching the Running Sheet.

### 2. Kiosk Live View (`KioskSetup.tsx`, lines 209-235)
- **Open Kiosk** and **Generate QR** (currently `variant="outline"` with purple border): change to green-bordered tablet style.
- **Launch Fullscreen** (currently `variant="default"`, solid purple): change to solid green background with white text (`bg-green-500 text-white hover:bg-green-600`), since it's the "active/selected" button.

### 3. Full Seating Chart (`FullSeatingChartPage.tsx`, lines 260-279)
- Change both "Download single page PDF" and "Download all pages PDF" from `variant="default" size="xs"` (solid purple) to green-bordered tablet style.

### 4. Dietary Requirements (`KitchenDietaryChart.tsx`, lines 493-512)
- Change both "Download single page PDF" and "Download all pages PDF" from `variant="default" size="xs"` (solid purple) to green-bordered tablet style.

### 5. Floor Plan (`FloorPlanPage.tsx`, lines 105-114)
- Change "Download PDF" button from `variant="default" size="sm"` (solid purple) to green-bordered tablet style.

### 6. Individual Table Charts (`IndividualTableSeatingChartPage.tsx`, lines 287-306)
- Change both "Download single page PDF" and "Download all pages PDF" from `variant="default" size="xs"` (solid purple) to green-bordered tablet style.

### 7. Place Cards (`PlaceCardsPage.tsx`, lines 387-406)
- Change both "Download single page PDF" and "Download all pages PDF" from `variant="default" size="xs"` (solid purple) to green-bordered tablet style.

### 8. QR Code Seating Chart (`QRCodeMainCard.tsx`, line 702)
- Change "Open Live View" button from `variant="default"` (solid purple) to solid green background with white text (`bg-green-500 text-white hover:bg-green-600`).

## Target Button Style (for all Download PDF buttons)
```
className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors"
```
Using raw HTML button or overriding the Button component's className to match the Running Sheet style exactly.

## Files Modified
- `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx`
- `src/components/Dashboard/Kiosk/KioskSetup.tsx`
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx`
- `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx`
- `src/components/Dashboard/FloorPlan/FloorPlanPage.tsx`
- `src/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage.tsx`
- `src/components/Dashboard/PlaceCards/PlaceCardsPage.tsx`
- `src/components/Dashboard/QRCode/QRCodeMainCard.tsx`
