

# Add Export Controls Box to Full Seating Chart

## What's changing
The two green PDF download buttons ("Download single page PDF" and "Download all pages PDF") will be wrapped in a purple-bordered "Export Controls" box, matching the exact styling used on the Running Sheet page. The buttons will be moved from their current inline position into this new container.

## Technical Details

**File:** `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx`

### Current layout (lines 257-277)
The two download buttons sit directly inside the second row of the header card, aligned right.

### New layout
Replace the current button container with the Running Sheet-style Export Controls box:

```
border border-primary rounded-xl p-3 flex flex-col gap-3
```

Structure:
1. **Top line**: Bold "Export Controls" label followed by muted description text: "Download the Full Seating Chart or share with your vendors."
2. **Second row**: The two existing green tablet-style download buttons side by side (unchanged styling).

This matches the exact pattern from `RunningSheetPage.tsx` (lines 169-191).

## Files to be modified
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx`

