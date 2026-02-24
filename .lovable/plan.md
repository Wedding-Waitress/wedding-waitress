

# Reorganize Individual Table Seating Chart Header

## What's Changing

The header card will be restructured into a cleaner vertical flow:

1. **Title + Description** at the top (unchanged)
2. **Choose Event + Table dropdowns** moved up directly below the description (instead of being separated in CardContent with extra padding)
3. **Export Controls** moved to the bottom of the card, styled as a purple-bordered box with text on the left and both download buttons on the right (same line)

## Visual Result

```text
+---------------------------------------------------------------+
| Individual Table Seating Chart                                 |
| Generate detailed seating charts for individual tables         |
|                                                                |
| Choose Event: [dropdown]    Table: [dropdown]                  |
|                                                                |
| +-----------------------------------------------------------+ |
| | Export Controls  Download & share your  | [PDF] [All PDF]  | |
| | individual table charts with your venue.|                  | |
| +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

## Technical Details

### File: `src/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage.tsx`

**Lines 266-370** -- Restructure the Card interior:

1. Remove the `flex-wrap justify-between` wrapper (lines 268-306) that currently places the title and Export Controls side-by-side
2. Place title + description at the top, left-aligned
3. Move the event/table selection row (currently in CardContent with `pt-8`) directly below the description with reduced spacing
4. Add Export Controls box at the bottom as a `border border-primary rounded-xl` container using `flex items-center justify-between` layout -- text on left, both green buttons on the right
5. Update Export Controls text to single-line format: bold "Export Controls" followed by "Download & share your individual table charts with your venue."
