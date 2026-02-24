

# Swap Header Layout in Full Seating Chart

## What's changing
In the top header box of the Full Seating Chart page, the positions of two elements will be swapped:
- The **icon + "Full Seating Chart" title** (with "Complete guest list with check-off boxes" subtitle) moves to the **left side**
- The **"Choose Event" label + dropdown** moves to the **right side**

## Technical Details

**File:** `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` (lines 195-233)

The inner content of the `flex items-center justify-between` div will be reordered:

1. **Left side** (currently right): The icon + title block with `FileText` icon, "Full Seating Chart" heading, and "Complete guest list with check-off boxes" description -- text alignment changed from `text-right` to `text-left`.

2. **Right side** (currently left): The "Choose Event" label and `Select` dropdown.

No functional changes -- just reordering the two flex children and adjusting text alignment.

## Files to be modified
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx`
