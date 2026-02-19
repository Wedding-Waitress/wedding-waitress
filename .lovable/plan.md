

# "Insert from DJ-MC" Button on Running Sheet Event Column

## What It Does

Adds an "Insert" dropdown button above the Event column header in the Running Sheet. When clicked, it shows three options that pull data from the DJ-MC Questionnaire and append it into the currently clicked row's Event text field.

### The Three Insert Options

1. **Ceremony** -- sub-menu with two choices:
   - **Names & Songs** -- pulls each item from the DJ-MC "Ceremony Music" section, showing the row label (e.g. "Processional (Bridesmaids Entrance)") plus the song title/artist if filled in
   - **Names Only** -- pulls only the row labels without song info

2. **Bridal Party Introductions** -- sub-menu with two choices:
   - **Names & Songs** -- pulls from the "Bridal Party Introductions" section, showing each role label and the name entered (value_text), plus song info
   - **Names Only** -- pulls only role labels and names

3. **Speeches** -- single option (Names only):
   - Pulls from the "Speeches" section, showing the role (row_label) and the speaker name (value_text) for each entry that has data

### Behaviour

- The inserted text is **appended below** any existing text in the Event column of the row
- If the Event field already has content (e.g. "Guests Arrive"), the new content goes underneath it, separated by a newline
- If no DJ-MC Questionnaire data exists for the selected event, a toast message will inform the user: "No DJ-MC data found. Please fill in the DJ-MC Questionnaire first."

## Technical Details

### Files Modified

**1. `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`**
- Add an "Insert" dropdown button (using DropdownMenu) positioned between the Event textarea and the Who textarea, visible on hover (same pattern as existing row action buttons)
- The dropdown has three top-level items: Ceremony, Bridal Party Introductions, Speeches
- Ceremony and Bridal Party Introductions each open a sub-menu with "Names & Songs" and "Names Only"
- Speeches has a single click action (names only)
- New prop: `onInsertFromDJMC: (type: 'ceremony' | 'introductions' | 'speeches', includesSongs: boolean) => void`

**2. `src/components/Dashboard/RunningSheet/RunningSheetSection.tsx`**
- Add an "Insert" label in the column header area, positioned above the Event column on the right side
- Pass the `onInsertFromDJMC` callback down to each `RunningSheetRow`
- Wire up the callback to fetch DJ-MC data and update the row

**3. `src/components/Dashboard/RunningSheet/RunningSheetPage.tsx`**
- Import and use `useDJMCQuestionnaire` hook (or fetch DJ-MC data directly) to make questionnaire data available
- Pass DJ-MC questionnaire data down to `RunningSheetSection`
- Implement the logic to format and insert the text into a specific row's `description_rich`

### Data Formatting

**Ceremony -- Names & Songs:**
```
Prelude (As Guests Arrive): [song_title_artist]
Processional (Bridesmaids Entrance): [song_title_artist]
Bride Walking Down the Aisle: [song_title_artist]
...
```

**Ceremony -- Names Only:**
```
Prelude (As Guests Arrive)
Processional (Bridesmaids Entrance)
Bride Walking Down the Aisle
...
```

**Bridal Party Introductions -- Names & Songs:**
```
Groom's Parents: [value_text] - [song_title_artist]
Bride's Parents: [value_text] - [song_title_artist]
...
```

**Bridal Party Introductions -- Names Only:**
```
Groom's Parents: [value_text]
Bride's Parents: [value_text]
...
```

**Speeches -- Names:**
```
Father of the Bride: [value_text]
Father of the Groom: [value_text]
Best Man: [value_text]
...
```

- Items where the relevant field (value_text or song_title_artist) is empty will still show the role/label but without the colon and value
- The formatted text is inserted as bullet points in the description_rich structure, appended after any existing content

### Insert Button Placement

The "Insert" text/button will appear in the column header row, aligned to the right edge of the Event column. It will be styled as a small, subtle link-style button (text-primary, text-xs) so it doesn't clutter the interface.

