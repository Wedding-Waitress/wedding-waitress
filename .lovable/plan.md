
# Add "Clear Section" to DJ-MC Questionnaire Dropdown + Update Dialog Messages

## What Changes

In the three-dot dropdown menu on each DJ-MC Questionnaire section, the menu will become:

1. **Duplicate Section** -- stays as-is (non-destructive)
2. **Clear Section** (NEW) -- clears all text fields on every row in the section but keeps the rows intact. Shows a confirmation warning.
3. **Reset to Default** -- already has a dialog, but will update the message to match the consistent style.
4. **Delete Section** -- already has a dialog, but will update the message to match the consistent style.

All three destructive actions show a confirmation pop-up with Cancel and an action button.

## Technical Details

### File: `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx`

**State:**
- Add `showClearSectionDialog` boolean state (default `false`).

**Imports:**
- Add `Eraser` to the lucide-react import.

**Dropdown menu (lines 271-287):**
- Add a new `DropdownMenuItem` for "Clear Section" with Eraser icon, between "Duplicate Section" and "Reset to Default".
- onClick sets `showClearSectionDialog(true)`.

**Clear Section logic:**
- On confirm, iterate through all `section.items` and call `onUpdateItem(item.id, { value_text: null, song_title_artist: null, music_url: null, duration: null, pronunciation_audio_url: null })` for each item.

**New AlertDialog (after existing dialogs, before `</>`):**
- Title: "Clear Section?"
- Description: "This will clear all text in every row of this section. The rows will remain but all content will be erased. Once cleared, it cannot be retrieved."
- Buttons: Cancel and "Clear Section"

**Update existing dialog messages:**
- Reset dialog description: keep as-is (already good).
- Delete dialog description: update to "This will delete this entire section and all its rows. Once deleted, it cannot be retrieved." with Cancel and Delete buttons.
