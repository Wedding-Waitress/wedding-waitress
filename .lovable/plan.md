

## Plan: Fix "Time Allowed" Header Alignment in Speeches Section

### Problem
The "Time Allowed" header text sits too far left and is bunched up against the "Pronunciation Audio" header. It needs to be moved right so it centers above the duration input field (e.g., "3min", "e.g. 5 min") in the rows below.

### Root Cause
The header `<div className="w-24 shrink-0 text-center">Time Allowed</div>` matches the row input width (`w-24`), but both the header and row have a `w-16` actions spacer to their right. The header text appears left-shifted because the `w-24` container is too narrow relative to the visual weight of the input field + its internal padding.

### Fix

**File: `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnaireSection.tsx`** (line 438)

Widen the "Time Allowed" header container and add right padding to shift its text rightward, so it visually centers above the duration input. Change from `w-24 shrink-0 text-center` to a wider container (e.g., `w-32 shrink-0 text-right pr-4`) or use `mr-` to push it right. The exact approach: expand the header width to account for the actions column gap, using `w-24 shrink-0 text-center mr-8` to shift it rightward by absorbing some of the actions spacer, and reduce the actions spacer width for the speeches section accordingly.

Simpler approach: Just change line 438 to use `text-right` or add `pr-` padding to nudge the text right within the existing `w-24` box, aligning it closer to the center of the input below.

### Scope
- One line change in `DJMCQuestionnaireSection.tsx` (line 438)
- No changes to row layout or any other sections

