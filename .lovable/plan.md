

# Rebuild Running Sheet -- Fresh Start, DJ-MC Questionnaire Pattern

## Overview

Delete all existing Running Sheet component files and rebuild the feature from scratch, following the exact same layout, patterns, and UX as the DJ-MC Questionnaire page. The existing database tables (`running_sheets` and `running_sheet_items`) will be reused -- they already have the right columns (`time_text`, `description_rich`, `responsible`).

## What Gets Deleted

All 8 files in `src/components/Dashboard/RunningSheet/`:
- `RunningSheetPage.tsx` (existing 838-line implementation)
- `RunningSheetTableView.tsx`
- `RunningSheetInlineRow.tsx`
- `InlineRichTextEditor.tsx`
- `VenueLogoUpload.tsx`
- `RunningSheetSettingsSidebar.tsx`
- `DeleteRowConfirmationModal.tsx`
- `index.ts`

Also deleted/replaced:
- `src/hooks/useRunningSheet.ts` (rewritten to match questionnaire hook pattern)
- `src/types/runningSheet.ts` (simplified)
- `src/pages/RunningSheet.tsx` (standalone page -- no longer needed)
- `src/lib/runningSheetDocxExporter.ts` (replaced with PDF exporter)
- Feature flag removed -- `flags.runningSheet` set to `true` or removed entirely

## New Page Layout (mirrors DJ-MC Questionnaire exactly)

```text
+--------------------------------------------------------------+
|  [ClipboardList icon]  Running Sheet                         |
|  Organise the perfect schedule for your wedding or event     |
+--------------------------------------------------------------+
|  Choose Event [dropdown]    [Share with...]  | Export Controls|
|                                              | [Download     |
|                                              |  Entire       |
|                                              |  Running Sheet|
|                                              |  PDF]         |
+--------------------------------------------------------------+
|              Jason & Linda's Wedding                         |
|  Ceremony: Saturday, 20th Feb 2026  |  Reception: ...        |
+--------------------------------------------------------------+
|                                                              |
|  [v] Running Sheet    [Notes] [...] [Download Section PDF]   |
|  ---------------------------------------------------------- |
|  TIME          |  EVENT              |  WHO                  |
|  ---------------------------------------------------------- |
|  [grip] 3:30   |  Ceremony           |  Kelly Evens          |
|  [grip] 4:00   |  Group Photos       |  Photographer         |
|  [grip] 4:15   |  Pre-Dinner Drinks  |                       |
|  ...           |  ...                |  ...                  |
|  [grip] 11:00  |  The End            |                       |
|  ---------------------------------------------------------- |
|              [+ Add Row]                                     |
+--------------------------------------------------------------+
```

## Feature Details

### Header Section (identical to DJ-MC Questionnaire)
- Purple icon + "Running Sheet" title + subtitle
- `StandardEventSelector` dropdown (same component)
- "Share with..." button opening a share modal (same pattern as `DJMCShareModal`)
- Export Controls box with purple border containing "Download Entire Running Sheet PDF" button

### Event Details Bar
- Shows event name, ceremony/reception dates, times, and venues (same code as DJ-MC Questionnaire)

### Single Section Card (one big box)
- Collapsible card with editable label (default: "Running Sheet")
- Notes button (notes for venue/DJ)
- Three-dot menu: Duplicate Section, Reset to Default, Delete Section
- Download Section PDF button
- Three column headers: **TIME** | **EVENT** | **WHO**

### Rows
- Each row: drag handle + time input + event text + who text
- Row actions on hover: Duplicate, Delete
- Drag-to-reorder via `@dnd-kit`
- "+ Add Row" button at bottom
- Starts with 10 example rows showing a typical wedding timeline:

| TIME | EVENT | WHO |
|------|-------|-----|
| 3:30 | Ceremony | Celebrant |
| 4:00 | Group & Family Photos | Photographer |
| 4:15 | Pre-Dinner Drinks & Canapes |  |
| 5:45 | Guests Seated |  |
| 6:00 | Bridal Party Entrance |  |
| 6:15 | Entree |  |
| 7:00 | Main Meals |  |
| 7:45 | Speeches | MC |
| 8:30 | Dessert |  |
| 10:30 | Flower Toss & Farewell Circle | MC |

### Sharing System
- Same token-based sharing as DJ-MC Questionnaire
- New DB table `running_sheet_share_tokens` (or reuse a pattern)
- Public read-only route: `/running-sheet/:token`
- Share modal identical to `DJMCShareModal`

### PDF Export
- New `src/lib/runningSheetPdfExporter.ts` using jsPDF (same approach as DJ-MC Questionnaire PDF exporter)
- A4 portrait, three-column table layout
- Event name, dates, venue at top
- Wedding Waitress logo branding
- "Download Entire Running Sheet PDF" button

## Sidebar Placement

Running Sheet will be placed **above** DJ-MC Questionnaire in the sidebar:
```
...
Kiosk Live View
Running Sheet        <-- here (with ClipboardList icon)
DJ-MC Questionnaire
```

Feature flag removed -- Running Sheet is always visible.

## Technical Plan -- Files to Create/Modify

### New Files (7 files)
1. **`src/components/Dashboard/RunningSheet/RunningSheetPage.tsx`** -- Main page component (mirrors `DJMCQuestionnairePage.tsx`)
2. **`src/components/Dashboard/RunningSheet/RunningSheetSection.tsx`** -- Single section card with header, notes, three-dot menu, rows (mirrors `DJMCQuestionnaireSection.tsx`)
3. **`src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`** -- Individual row with drag handle, time/event/who fields (mirrors `DJMCSectionRow.tsx`)
4. **`src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx`** -- Share modal (mirrors `DJMCShareModal.tsx`)
5. **`src/components/Dashboard/RunningSheet/index.ts`** -- Barrel export
6. **`src/hooks/useRunningSheet.ts`** -- Rewritten hook (mirrors `useDJMCQuestionnaire.ts`)
7. **`src/lib/runningSheetPdfExporter.ts`** -- PDF export using jsPDF (mirrors DJ-MC PDF exporter)

### Modified Files (4 files)
1. **`src/components/Dashboard/AppSidebar.tsx`** -- Move Running Sheet above DJ-MC Questionnaire, remove feature flag condition
2. **`src/pages/Dashboard.tsx`** -- Update the `running-sheet` case to render new component with `selectedEventId` and `onEventSelect` props, remove feature flag check
3. **`src/lib/featureFlags.ts`** -- Remove `runningSheet` flag (or set to `true`)
4. **`src/types/runningSheet.ts`** -- Simplify types to match new structure

### Deleted Files (8 files)
- All existing `src/components/Dashboard/RunningSheet/*.tsx` files (replaced by new ones)
- `src/pages/RunningSheet.tsx` (standalone page no longer needed)
- `src/lib/runningSheetDocxExporter.ts` (replaced by PDF exporter)
- `src/App.tsx` -- Remove the `/running-sheet` standalone route

### Database
- Reuse existing `running_sheets` and `running_sheet_items` tables (columns match: `time_text`, `description_rich` for event text, `responsible` for who)
- Create `running_sheet_share_tokens` table for sharing (same schema pattern as `dj_mc_share_tokens`)

## What Stays the Same as DJ-MC Questionnaire
- Page header layout (icon, title, subtitle)
- Event selector card with Share button + Export Controls box
- Event details bar (ceremony/reception info)
- Section card pattern (collapsible, notes, three-dot menu, download section PDF)
- Row management (drag-to-reorder, add, duplicate, delete)
- Share modal and token system
- PDF export branding and layout approach

## What's Different from DJ-MC Questionnaire
- Only 3 simple columns: Time, Event, Who (no music URLs, no pronunciation, no song titles)
- Single section (one big table) instead of multiple section types
- Time column uses a simple text input (e.g., "3:30", "7.45") rather than a complex picker
- No progress indicator
- No song counts or speaker counts

