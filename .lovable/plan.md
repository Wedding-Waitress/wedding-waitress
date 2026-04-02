

## Plan: Fix DJ-MC Questionnaire PDF Filenames

### What Changes
Two filename patterns in `src/lib/djMCQuestionnairePdfExporter.ts` need updating to use the event date (DD-MM-YYYY) instead of today's date (YYYY-MM-DD), and preserve readable characters like `&` and `'` in the event name.

### Current vs Desired

**Entire questionnaire (line 491-492):**
- Current: `Jason___Linda_s_Wedding-DJ-MC-Questionnaire-2026-04-02.pdf`
- Desired: `Jason & Linda's Wedding-DJ-MC Questionnaire-20-12-2026.pdf`

**Single section (line 367-369):**
- Current: `Jason___Linda_s_Wedding-Ceremony_Music-2026-04-02.pdf`
- Desired: `Jason & Linda's Wedding-Ceremony Music-20-12-2026.pdf`

### Changes in `src/lib/djMCQuestionnairePdfExporter.ts`

1. **Line 367-369** (single section export): Replace the sanitization to keep readable chars (`&`, `'`, spaces), use event date formatted as DD-MM-YYYY, and preserve spaces in section name
2. **Line 491-492** (full questionnaire export): Same sanitization change, use event date, add space in "DJ-MC Questionnaire"

Both will use `event.date` (falling back to current date if null) formatted as DD-MM-YYYY. The filename sanitizer will only strip filesystem-unsafe characters (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) rather than stripping everything non-alphanumeric.

### No other changes

