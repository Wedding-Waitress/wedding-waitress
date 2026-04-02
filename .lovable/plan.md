

## Plan: Align DJ-MC Questionnaire Column Headers with Row Content

### Problem
The column header text (Event, Names/Info, Audio, Song Title & Artist, Music with Link) does not visually align with the data content in the rows below. The headers sit at the left edge of their flex containers, while the row content has internal padding (`px-3`), causing a visual offset.

### Changes

**File: `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx`** (lines 349-448, the header row)

1. **"Names / Info"** (and equivalents like "Names", "Dedication / Details", "Song Title & Artist" in combined columns) — add `pl-3` to match the `px-3` padding of the row input fields below
2. **"Audio" label** — add "Pronunciation" above it in a smaller font size (`text-[9px]`), keeping "Audio" below. The `w-10 text-center` stays unchanged.
3. **"Song Title & Artist"** (standalone column) — add `pl-3` to align with the `px-3` content padding in the rows
4. **"Music with Link"** — add `pl-3` to align with the music URL field content below

These padding adjustments apply to **all section types** (ceremony, cocktail, introductions, speeches, main_event, dinner, dance, traditional, do_not_play) so every section's headers align consistently with their row content.

### What stays the same
- Column 1 (Event/Song Number/etc.) keeps its current alignment — the `px-2` in the row label div is close enough
- Row content, row actions, drag handles — no changes
- No structural/width changes to the flex layout

