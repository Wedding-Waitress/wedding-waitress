

# Lock DJ-MC Questionnaire for Production

Add "PRODUCTION-READY -- LOCKED FOR PRODUCTION" warning headers to all 14 DJ-MC Questionnaire files, matching the same pattern used for the Guest List and Tables pages.

## Files to Protect (14 total)

### Components (8 files)
- `DJMCQuestionnairePage.tsx` -- Main page component
- `DJMCQuestionnaireSection.tsx` -- Section accordion with items
- `DJMCSectionRow.tsx` -- Individual row editing
- `DJMCShareModal.tsx` -- Share token modal
- `DJMCMusicUrlField.tsx` -- Music URL input with platform detection
- `DJMCProgressIndicator.tsx` -- Progress bar component
- `DJMCPronunciationRecorder.tsx` -- Audio pronunciation recorder
- `index.ts` -- Barrel export

### Hook
- `useDJMCQuestionnaire.ts` -- All CRUD operations, sharing, reordering

### Libraries
- `djMCQuestionnaireTemplates.ts` -- Default section templates
- `djMCQuestionnairePdfExporter.ts` -- PDF export logic
- `djMCInsertFormatter.ts` -- Formatter for Running Sheet insertion

### Types
- `djMCQuestionnaire.ts` -- TypeScript interfaces

### Public Page
- `DJMCPublicView.tsx` -- Read-only shared view for DJs/MCs

## What Gets Added

Each file will receive a comment block at the very top:

```
/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
```

No functional code changes -- only protective comment headers are added.
