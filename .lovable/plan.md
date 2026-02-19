
# Add Clear Text + Confirmation Dialogs to DJ MC Questionnaire Rows

## Summary

Copy the three-icon action pattern from the Running Sheet (Duplicate, Clear Text, Delete) into the DJ MC Questionnaire rows. Currently the questionnaire only has Duplicate and Delete with no confirmation warnings. After this change:

- **Duplicate** stays as-is (non-destructive, no warning needed)
- **Clear Text** (new) -- Eraser icon between Duplicate and Delete, with a confirmation dialog: "This will clear all text on this row. Once cleared, it cannot be retrieved."
- **Delete** -- Now shows a confirmation dialog: "This will delete this row. Once deleted, it cannot be retrieved." with Cancel and Delete buttons.

## Technical Details

### File: `src/components/Dashboard/DJMCQuestionnaire/DJMCSectionRow.tsx`

**Imports:**
- Add `Eraser` to the lucide-react import (alongside `GripVertical`, `Trash2`, `Copy`)
- Add `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` from `@/components/ui/alert-dialog`

**Props:**
- Add `onClearText?: () => void` to the `DJMCSectionRowProps` interface

**State:**
- Add `showClearDialog` and `showDeleteDialog` boolean states (both default `false`)

**Clear Text logic:**
- `onClearText` will call `onUpdate` with all text fields reset: `{ label_text: '', value_text: '', song_title_artist: '', notes: '', duration: '', music_url: '' }`

**Action buttons (two locations -- do_not_play layout at ~line 206 and standard layout at ~line 594):**
- Change width from `w-16` to `w-auto` to fit 3 icons
- Add Eraser button between Duplicate and Delete (with `title="Clear Text"`)
- Change Delete `onClick` from direct `onDelete()` to `setShowDeleteDialog(true)`
- Change Clear Text `onClick` to `setShowClearDialog(true)`

**Dialogs (added at end of each layout's JSX, before closing `</div>`):**
- Clear Text dialog: Title "Clear Text?", description about clearing, Cancel + "Clear Text" buttons
- Delete dialog: Title "Delete Row?", description about deletion, Cancel + Delete (destructive styled) buttons

### File: `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx`

- Pass `onClearText` to each `DJMCSectionRow` that calls `onUpdateItem(item.id, { label_text: '', value_text: '', song_title_artist: '', notes: '', duration: '', music_url: '' })`
