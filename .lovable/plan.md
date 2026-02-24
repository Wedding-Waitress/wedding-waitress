

# Fix Running Sheet PDF Export and Add Section Header Toggle

## Three Changes Required

### 1. PDF Header: Consolidate to 2 Lines (Ceremony First, Then Reception)

**File:** `src/lib/runningSheetPdfExporter.ts`

Currently the PDF header shows 4 separate lines:
- Reception: Sunday 20th, December 2026
- Sheldon Receptions | 6:00 PM - 11:00 PM
- Ceremony: Sunday 20th, December 2026
- Sheldon Receptions | 3:30 PM - 5:55 PM

Change to 2 lines, with Ceremony always listed first:
- Ceremony: Sunday 20th, December 2026 | Sheldon Receptions | 3:30 PM - 5:55 PM
- Reception: Sunday 20th, December 2026 | Sheldon Receptions | 6:00 PM - 11:00 PM

If there is no ceremony data, only show the Reception line.

### 2. PDF Logo: Center at Bottom of Page

**File:** `src/lib/runningSheetPdfExporter.ts`

The logo container div already has `text-align:center` but because it sits inside a flex column, it needs `width:100%` and `align-self:center` to properly center. Add explicit `width:100%` to the logo wrapper div so the centered text-align takes effect across the full page width.

### 3. PDF + Dashboard: Make Entire Section Header Row Red (All 3 Columns)

**File:** `src/lib/runningSheetPdfExporter.ts`

Currently only the Time column gets `font-weight:bold;color:#dc2626` for section headers. Change the PDF export so all three columns (Time, Event, Who) render in bold red when `is_section_header` is true.

Important: Only the base text of the Event column (e.g., "Ceremony", "Reception doors open") should be red. Any text inserted from the DJ-MC Questionnaire (which gets appended below) remains black. Since the questionnaire text is appended as additional lines, the simplest approach is to make the entire row red in the PDF -- the questionnaire inserts create separate content that naturally follows after the section header text.

**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

Currently `headerClasses` (bold red) is only applied to the Time textarea. Apply it to all three textareas (Time, Event, Who) so the dashboard preview matches the PDF output.

### 4. Dashboard UI: Add "Highlight Row" Toggle Button

**File:** `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx`

Add a new action button to the left of the existing "Insert from Questionnaire" button. This button will toggle `is_section_header` on/off for that row.

- Button name: "Highlight Row" (tooltip)
- Icon: `Highlighter` from lucide-react (a highlighter pen icon)
- When active (row is a section header): icon shows in red to indicate it's toggled on
- When clicked: calls `onUpdate(item.id, { is_section_header: !item.is_section_header })` to toggle the flag
- Position: first button in the row actions group, before "Insert from Questionnaire"

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/lib/runningSheetPdfExporter.ts` | Consolidate header to 2 lines (ceremony first), center logo with full width, make all 3 columns red for section headers |
| `src/components/Dashboard/RunningSheet/RunningSheetRow.tsx` | Apply red styling to all 3 columns for section headers, add "Highlight Row" toggle button |

## Technical Notes

- The `is_section_header` field already exists in the database and types -- no schema changes needed
- The `onUpdate` callback already handles partial updates including `is_section_header` -- no hook changes needed
- Questionnaire-inserted text: when a user inserts from the questionnaire, it appends to the Event field. The `is_section_header` flag is independent of the text content, so toggling highlight on/off works regardless of what text is in the row
- No changes to data model, sharing, or any other functionality

