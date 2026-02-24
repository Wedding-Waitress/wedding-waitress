

# Reorganize Floor Plan Header Layout

## What's Changing
The Floor Plan header card will be reorganized into a cleaner vertical flow:

1. **Line 1**: Title "Floor Plan" (left)
2. **Line 2**: Description text
3. **Line 3**: Choose Event dropdown + Floor Plan Type dropdown + Total Attending (moved up, directly below description)
4. **Line 4**: Export Controls box at the bottom of the card, with "Export Controls" label and description text on one line, and the green Download PDF button below

## Visual Result
```text
+---------------------------------------------------------------+
| Floor Plan                                                     |
| Design and visualize your ceremony or reception seating layout |
|                                                                |
| Choose Event: [dropdown]  Floor Plan Type: [dropdown]          |
|   Total Attending: 89 (Bride & Groom + Celebrant + ...)       |
|                                                                |
| +-----------------------------------------------------------+ |
| | Export Controls  Download your floor plan for venue staff.  | |
| | [Download PDF]                                              | |
| +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

## Technical Details

### File: `src/components/Dashboard/FloorPlan/FloorPlanPage.tsx`

**Lines 85-198** -- Restructure the CardContent interior:

1. Remove the `flex-row justify-between` wrapper that currently puts the title and Export Controls side-by-side
2. Place title + description at the top (no change to content)
3. Move the event/type selection row directly below the description (remove the `pt-4` extra padding)
4. Move the Export Controls box to the bottom of the card content
5. Change Export Controls to single-line format: bold "Export Controls" followed by description text on same line (matching Dietary Requirements pattern)
6. Remove the separate `<h3>` and `<p>` tags, replace with single `<p>` containing bold span + text

The Export Controls box keeps its purple border styling (`border border-primary rounded-xl`) and the green Download PDF button remains unchanged.

