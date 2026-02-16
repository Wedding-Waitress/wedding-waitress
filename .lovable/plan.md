

## Fix Export Guest List: Filename, Title Case Headers, and Bold Headers

### Problem
The previous changes are in the code but two issues remain:

1. **Bold headers do not work**: The free `xlsx` (SheetJS community edition) silently ignores the `.s` style property. Bold formatting requires switching to `xlsx-js-style`, a drop-in replacement that supports cell styles.
2. **The changes may not have deployed properly** to your browser — the screenshots show old CSV behavior.

### Changes

**File: `src/components/Dashboard/GuestListTable.tsx`**

1. **Replace `xlsx` import with `xlsx-js-style`** — this is a compatible drop-in replacement that supports cell styles including bold. Change `import * as XLSX from 'xlsx'` to `import * as XLSX from 'xlsx-js-style'`.

2. **Verify filename logic** (already in code, will confirm it works):
   - Format: `Guest-List-Jason-Lindas-Wedding-05-12-2026.xlsx`
   - Each word capitalized, single hyphens, event date as DD-MM-YYYY

3. **Verify Title Case headers** (already in code, will confirm):
   - `First Name, Last Name, Table Name, Seat No, RSVP, Dietary, Mobile, Email, Notes, Relation Partner, Relation Role, Relation Display`

4. **Bold headers will now work** because `xlsx-js-style` supports `ws[cellRef].s = { font: { bold: true } }` — applied to both Download Template and Export Guest List.

**File: `package.json`**

- Add `xlsx-js-style` dependency (replaces usage of `xlsx` for this file)

### What Is NOT Changed
- Import logic (still accepts both `.csv` and `.xlsx`)
- No other files or features modified
- Guest list table display unchanged

