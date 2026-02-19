
# Update Running Sheet to Match Screenshot Exactly

## Two Problems to Fix

### Problem 1: Existing event shows old rows
The `DEFAULT_ROWS` were updated in the code, but your existing "Jason & Linda's Wedding" running sheet was created before the update. The database still has the old 10 rows. **Quick fix:** Click the three-dot menu on the Running Sheet section and choose "Reset to Default" -- this will replace the old rows with the new 13-row template.

### Problem 2: Rich content not supported
Your screenshot shows multi-line descriptions with bullet points and helper text. The current row component uses a single-line `<Input>` for the EVENT column, which cannot display that content. This needs to change to a `<Textarea>` that auto-grows.

### About the Live URL
The publish dialog showing `wedding-waitress.lovable.app` is just the default Lovable staging URL. Your custom domain `weddingwaitress.com` is configured via DNS and still works. Both URLs serve the same app. Click "Manage 3 domains" to see your custom domain settings.

## Changes

### 1. Update DEFAULT_ROWS with exact screenshot content
**File:** `src/hooks/useRunningSheet.ts` (lines 14-28)

Update the `description_rich` field to include bullet points and helper text matching the screenshot exactly:

- Row 6.30 (Bridal Party Introduction): Add sub-text about using DJ-MC Questionnaire and sync option
- Row 7.30: Change to bullet list format -- Cake Cutting & Toasting for Photos, Bridal Dance, Bridal Party Dance with Wedding Couple, Dance Floor Open for All Guests
- Row 8.30 (Speeches): Add sub-text about using DJ-MC Questionnaire and sync option
- Row 9.00 (Games then Dance Bracket): Change to bullet list -- The Shoe Game, The Photo Dash, Dance Floor opened
- Row 10.30: Change to bullet list -- Flower Toss, Garter Toss, Farewell Circle or Arch!
- Row 7.00: Change text to "Entree Served" with accent (Entree) to match screenshot

The `description_rich` field will use a structured format:
```
{
  text: "Bridal Party Introduction",
  bullets: ["Cake Cutting & Toasting for Photos", "Bridal Dance", ...],
  subText: "(Use the DJ-MC Questionnaire to organise...)"
}
```

### 2. Change EVENT column from Input to Textarea
**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

- Replace the single-line `<Input>` for the EVENT column with an auto-growing `<Textarea>`
- Render bullet points from `description_rich.bullets` as readable text with bullet markers
- Show sub-text / helper text from `description_rich.subText` below the main text
- The textarea will display the full combined text so users can edit it naturally
- Section header rows (is_section_header = true) will display with **bold** text styling

### 3. Style section header rows
**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

- When `item.is_section_header` is true, apply bold font weight and red text color to the TIME and EVENT fields to match the screenshot's red bold section headers (3.30 Ceremony, 6.00 Reception, 7.00 Entree, 8.00 Main Meals, 11.00 Conclusion)

### 4. WHO column -- multi-line support
**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

- The WHO column also needs a Textarea since some entries span multiple lines (e.g., "DJ / Band & MC" on one line, "Photographer & Video" on the next)
- The responsible field for rows like 6.30, 7.30, 9.00, 10.30 will store the text with line breaks

### Summary of files changed
- `src/hooks/useRunningSheet.ts` -- Update DEFAULT_ROWS with exact rich content
- `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx` -- Textarea for EVENT and WHO, bold red styling for section headers

No other files are changed. After the update, click "Reset to Default" on your existing event to see the new rows.
