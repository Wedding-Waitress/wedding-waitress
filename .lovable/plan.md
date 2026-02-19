

# Rebuild Running Sheet -- Fresh Start

## Overview

Delete all old Running Sheet files and rebuild from scratch, mirroring the DJ-MC Questionnaire's exact layout and patterns. Three columns: **Time**, **Event**, **Who**.

## What Gets Deleted

- All files in `src/components/Dashboard/RunningSheet/` (8 files)
- `src/pages/RunningSheet.tsx` (standalone page)
- `src/lib/runningSheetDocxExporter.ts`
- Old `src/hooks/useRunningSheet.ts` (rewritten)
- `/running-sheet` route from `App.tsx`
- Feature flag removed

## What Gets Built

### New Files (7)
1. **`RunningSheetPage.tsx`** -- Main page (mirrors DJMCQuestionnairePage)
2. **`RunningSheetSection.tsx`** -- Section card with header, notes, three-dot menu, rows
3. **`RunningSheetRow.tsx`** -- Draggable row with time/event/who fields
4. **`RunningSheetShareModal.tsx`** -- Token-based sharing modal
5. **`index.ts`** -- Barrel export
6. **`useRunningSheet.ts`** -- Rewritten hook
7. **`runningSheetPdfExporter.ts`** -- jsPDF A4 portrait exporter

### Modified Files
- **AppSidebar.tsx** -- Add Running Sheet above DJ-MC Questionnaire
- **Dashboard.tsx** -- Wire up the new component
- **featureFlags.ts** -- Remove the flag
- **App.tsx** -- Remove standalone route

### Database
- Create `running_sheet_share_tokens` table
- Create `generate_running_sheet_share_token` and `get_running_sheet_by_token` RPC functions
- Reuse existing `running_sheets` and `running_sheet_items` tables

### Default Rows (10 example rows)

| TIME | EVENT | WHO |
|------|-------|-----|
| 3:30 | Ceremony | Celebrant |
| 4:00 | Group and Family Photos | Photographer |
| 4:15 | Pre-Dinner Drinks and Canapes | |
| 5:45 | Guests Seated | |
| 6:00 | Bridal Party Entrance | |
| 6:15 | Entree | |
| 7:00 | Main Meals | |
| 7:45 | Speeches | MC |
| 8:30 | Dessert | |
| 10:30 | Flower Toss and Farewell Circle | MC |

### Features
- Drag-to-reorder rows
- Add, duplicate, delete rows
- Section notes, three-dot menu (Duplicate/Reset/Delete), download section PDF
- Event selector dropdown, Share button, Export Controls
- Event details bar (ceremony/reception info)
- PDF export with Wedding Waitress branding
- Token-based public read-only sharing

## Sidebar Placement
Running Sheet sits above DJ-MC Questionnaire with a ClipboardList icon.

