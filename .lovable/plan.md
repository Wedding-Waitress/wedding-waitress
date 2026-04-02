

## Plan: Fix Running Sheet Notes Sync to Public View

### Problem
The Running Sheet's "Notes" field and "Section Label" are stored only in React local state — they are never persisted to the database. When a shared link is opened, notes always appear empty because the `get_running_sheet_by_token` RPC has no way to return them.

The DJ-MC Questionnaire notes are already persisted in `dj_mc_sections.notes` and returned by the RPC. Based on code review, DJ-MC notes should be working. However, the user reports they are not syncing — this is likely due to the `showNotes` toggle state not re-initializing when section data updates via realtime. I will add a `useEffect` to auto-show notes when they become non-null.

### Changes

#### 1. Database Migration
Add `section_notes` and `section_label` columns to the `running_sheets` table:
```sql
ALTER TABLE running_sheets ADD COLUMN IF NOT EXISTS section_notes text;
ALTER TABLE running_sheets ADD COLUMN IF NOT EXISTS section_label text DEFAULT 'Running Sheet';
```

Update `get_running_sheet_by_token` RPC to return these two new fields.

Update `update_running_sheet_item_by_token` — or create a new RPC `update_running_sheet_meta_by_token` — to allow the public view to save notes/label changes.

#### 2. Update `useRunningSheet.ts` (Dashboard hook)
- When `setSectionNotes` or `setSectionLabel` is called, persist the change to the `running_sheets` table (debounced)
- On `fetchSheet`, load `section_notes` and `section_label` from the `running_sheets` row and initialize state from them

#### 3. Update `RunningSheetPublicView.tsx`
- After fetching data via the RPC, initialize `sectionNotes` and `sectionLabel` from the returned values
- When the user (with edit permission) changes notes/label, save via a new RPC function

#### 4. Update Supabase Types
- Add `section_notes` and `section_label` to the `running_sheets` type definition

#### 5. Fix DJ-MC `showNotes` reactivity
In `DJMCQuestionnaireSection.tsx`, add a `useEffect` that updates `showNotes` to `true` when `section.notes` transitions from falsy to truthy (e.g. when notes arrive via realtime sync).

### Files Modified
- New migration SQL file (DB schema + RPC updates)
- `src/hooks/useRunningSheet.ts` — persist notes/label to DB, load on fetch
- `src/pages/RunningSheetPublicView.tsx` — load notes/label from RPC data, save changes via RPC
- `src/integrations/supabase/types.ts` — add new columns to types
- `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx` — add useEffect for showNotes reactivity

