

# Match DJ-MC Questionnaire Export Controls to Running Sheet Layout

## What's changing

The DJ-MC Questionnaire's export controls area will be restructured to be identical to the Running Sheet's layout. Currently, the "Share with DJ/MC" button sits outside the export controls box, and the layout is a single horizontal row. It needs to become a two-row layout inside the purple-bordered box, matching the Running Sheet exactly.

## Visual Layout (Target - matches Running Sheet)

```text
+-----------------------------------------------------------------------+
| Export Controls  Download your questionnaire and share it with your    |
|                  DJ-MC or wedding venue.                               |
|                                                                       |
|  [Share with DJ/MC]    [Download entire questionnaire PDF]            |
+-----------------------------------------------------------------------+
```

## Technical Details

**File:** `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx` (lines 166-198)

Changes:
1. Remove the standalone "Share with DJ/MC" `Button` component (lines 168-177) that sits outside the export controls box.
2. Restructure the export controls `div` to use `flex flex-col gap-3` (two rows) instead of `flex items-center gap-4` (single row).
3. Move the "Share with DJ/MC" button inside the export controls box, on the second row, as a green-bordered tablet button (same style as Running Sheet's "Share with...").
4. Place "Download entire questionnaire PDF" next to it on the same second row.
5. Update the "Share with DJ/MC" button styling from `Button variant="outline"` to the green-bordered style: `h-7 px-2.5 text-xs border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50`.
6. Reduce the Share2 icon to `h-3 w-3`.

The result will be structurally identical to the Running Sheet's export controls block (lines 169-191 of RunningSheetPage.tsx).
