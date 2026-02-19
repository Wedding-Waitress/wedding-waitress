

# Lock the Tables Page for Production

Add production-lock warning headers to all Tables page component files. This is the same protection pattern already used on the Full Seating Chart, Place Cards, and Delete Confirmation Modal -- a prominent comment block at the top of each file warning that the feature is locked and must not be modified without explicit owner approval.

## Files to Lock (8 files total)

1. **src/components/Dashboard/Tables/SortableTablesGrid.tsx** -- Core drag-and-drop grid logic
2. **src/components/Dashboard/Tables/SortableGuestItem.tsx** -- Individual draggable guest items
3. **src/components/Dashboard/Tables/TableGuestList.tsx** -- Guest list within each table card
4. **src/components/Dashboard/Tables/TopDropZone.tsx** -- Drop zone for Seat 1 positioning
5. **src/components/Dashboard/Tables/UnassignedGuestsPanel.tsx** -- Unassigned guests sidebar
6. **src/components/Dashboard/Tables/BulkMoveBar.tsx** -- Bulk move action bar
7. **src/components/Dashboard/Tables/index.ts** -- Barrel exports
8. **src/components/Dashboard/TableCard.tsx** -- Individual table card component

## What Gets Added

Each file receives this header block at the very top (before any existing code):

```
/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Tables page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break drag-and-drop guest assignment
 * - Changes could break table capacity validation
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
```

No functional code changes -- only protective comment headers are added.
