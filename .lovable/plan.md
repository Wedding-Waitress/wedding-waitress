

## Update Table Setup Description Text

### What Changes
Replace the single paragraph of text in the "Table Setup" card (line 441-443 in `src/pages/Dashboard.tsx`) with 6 styled bullet points matching the user's exact wording and formatting.

### File to Modify
- `src/pages/Dashboard.tsx` (lines 441-443)

### New Content
The existing `<CardDescription>` block will be replaced with a styled `<ul>` list containing 6 bullet points:

1. **Important -- Please Read:** (bold, red text)
2. Design your perfect seating arrangements by adding the number of tables you want to host your guests.
3. We suggest firstly adding a **"Bridal Table"** then the **"1 Groom's Family"** table, then the **"2 Bride's Family"** table.
4. Then add sequential numbering tables like **"1, 2, 3, 4, 5 & etc"**
5. Alternatively, have some fun by creating table names like **"Paris, New York, Rome, or Cairo"**.
6. Once you have set up all the table with names or numbers then move onto the next page > **"Guest List"**, to add your guest names & details.
7. Remember, you can always come back here, drag / drop & re-allocate that aunty who still doesn't talk to the other aunts or Uncles ha ha -- Have Fun!

### Technical Details
- Replace the `<CardDescription>` with a `<div>` containing a `<ul>` with `list-disc` styling
- First bullet uses `text-red-600 font-bold` for the red bold "Important" line
- Bold words wrapped in `<strong>` tags
- All other styling (card layout, icon, title) remains untouched

