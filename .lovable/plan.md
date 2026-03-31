

## Apply Running Sheet Top Card Styling to DJ-MC Questionnaire

### What
Add the thin purple border and deep shadow to the top card (Choose Event + Export Controls) on the DJ-MC Questionnaire page, matching the Running Sheet page exactly.

### Change
**File: `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx`** (line 155)

- Change `<Card>` to `<Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">`

That's it -- one line change, no other modifications.

