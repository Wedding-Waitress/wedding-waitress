

## Fix Export Guest List CSV: Filename, Headers, and Bold Headers (Template + Export)

### 1. Export Guest List -- Fix Filename Format

**Current**: `guest-list-Jason---Linda-s-Weddidng-20260216.csv`

**New format**: `Guest-List-Jason-Lindas-Wedding-05-12-2026.csv`

Changes in `GuestListTable.tsx` (around line 834-836):
- Capitalize "Guest-List" prefix
- Clean up event name: collapse multiple hyphens into one, remove standalone `-s-` artifacts (keep possessives like "Linda's" as "Lindas")
- Use the **event date** (from `selectedEvent.date`) instead of today's date
- Format date as `DD-MM-YYYY` with hyphens (not `YYYYMMDD`)
- Capitalize the first letter of each word segment in the event name

### 2. Export Guest List -- Capitalize Column Headers

**Current**: `first_name, last_name, table_name, seat_no, rsvp, dietary, mobile, email, notes, relation_partner, relation_role, relation_display`

**New**: `First Name, Last Name, Table Name, Seat No, RSVP, Dietary, Mobile, Email, Notes, Relation Partner, Relation Role, Relation Display`

Add a `DISPLAY_EXPORT_HEADERS` array with Title Case headers and use it in the `exportGuestList` function instead of `EXPORT_HEADERS`.

### 3. Bold Headers -- Switch from CSV to XLSX

CSV is plain text and cannot support bold formatting. To achieve bold headers as requested, both the **Download Template** and **Export Guest List** functions will be updated to generate `.xlsx` (Excel) files instead of `.csv` using the `xlsx` library (SheetJS).

This library allows:
- Setting cell styles including **bold** font on the header row
- Proper Excel formatting out of the box
- Title Case headers that appear bold when opened

The import function will continue to accept `.csv` files (no change to import logic).

**Changes:**
- Install the `xlsx` npm package
- Update `downloadTemplate` to generate `.xlsx` with bold Title Case headers
- Update `exportGuestList` to generate `.xlsx` with bold Title Case headers
- Update filenames to use `.xlsx` extension
- The file input for import will also accept `.xlsx` in addition to `.csv`

### Summary of Changes

**File: `src/components/Dashboard/GuestListTable.tsx`**

1. Add `DISPLAY_EXPORT_HEADERS` array with Title Case versions of all export columns
2. Update `exportGuestList`: use Title Case headers, fix filename (capitalize words, single hyphens, event date as DD-MM-YYYY)
3. Update `downloadTemplate`: generate `.xlsx` with bold header row
4. Update `exportGuestList`: generate `.xlsx` with bold header row
5. Update import file input to accept both `.csv` and `.xlsx`

No other files or features are changed.

