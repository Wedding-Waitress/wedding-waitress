

# Three Running Sheet Fixes

## 1. Fix Inserted Text Styling (Ceremony row)

Currently, when DJ-MC data is inserted into a row that has `is_section_header: true` (like "Ceremony"), the entire textarea -- including the appended text -- renders in bold red because the `headerClasses` CSS applies to the whole textarea.

**Fix:** The textarea inherently applies one style to all its content. Since the header text ("Ceremony") and the inserted content share the same field, the solution is to only apply bold red styling to the first line when the row is a section header, by switching the Event column from a plain `<textarea>` to a `<div>` with `contentEditable` or, more practically, splitting the display: show the first line styled as bold red and the rest as normal black text. The simplest approach: keep the textarea but remove the `headerClasses` from the Event textarea only -- the header styling (bold red) will apply to the Time column only, while Event text stays black. The user's screenshot shows "Ceremony" in the Event column is red, but they want only that word red and the rest black. Since a textarea cannot have mixed styling, the best approach is to render the Event column as a div with the first line in header style and subsequent lines in normal style, with an editable textarea that appears on focus.

**Simpler approach chosen:** Only apply `headerClasses` to the Time column. The Event column will always use normal (black, non-bold) text. This matches the user's intent -- the time "3.30 PM" stays bold red for section headers, and the Event text is always normal black.

**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx` (line 149)
- Remove `${headerClasses}` from the Event textarea's className.

## 2. Remove "Insert (arrow)" from Column Header

The purple "Insert (arrow down)" text next to "Event" in the column header is not wanted.

**File:** `src/components/Dashboard/RunningSheet/RunningSheetSection.tsx` (lines 213-218)
- Remove the conditional block that renders the "Insert (arrow down)" span.
- Simplify the Event header back to just `<span>Event</span>`.

## 3. Change Tooltip from "Insert from DJ-MC" to "Insert from questionnaire"

**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx` (line 172)
- Change `title="Insert from DJ-MC"` to `title="Insert from questionnaire"`.

