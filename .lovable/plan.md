
# Lock Running Sheet for Production

Add "PRODUCTION-READY -- LOCKED FOR PRODUCTION" warning headers to all 8 Running Sheet files, matching the same pattern used for the DJ-MC Questionnaire.

## Files to Protect (8 total)

### Components (5 files)
- `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx` -- Main page component
- `src/components/Dashboard/RunningSheet/RunningSheetSection.tsx` -- Section with drag-and-drop rows
- `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx` -- Individual row editing
- `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx` -- Share token modal
- `src/components/Dashboard/RunningSheet/index.ts` -- Barrel export

### Hook
- `src/hooks/useRunningSheet.ts` -- All CRUD operations, sharing, reordering

### Library
- `src/lib/runningSheetPdfExporter.ts` -- PDF export logic

### Types
- `src/types/runningSheet.ts` -- TypeScript interfaces

## What Gets Added

Each file receives a comment block at the very top (no functional code changes):

```
/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This Running Sheet feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break running sheet data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
```

No functional code changes -- only protective comment headers are added.
