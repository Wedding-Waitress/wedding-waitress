
# Update Running Sheet Public View

## Changes

### 1. Update header wording
Change "You have been invited to view or print the running sheet of" to "You have been invited to view and download the running sheet of"

### 2. Replace Print button with Download PDF button
Remove the current Print button (which calls `window.print()`) and replace it with a "Download PDF" button that uses the exact same `exportRunningSheetPDF` function from `src/lib/runningSheetPdfExporter.ts` -- the same one used by the dashboard's "Download entire running sheet PDF" button.

The button will:
- Show a loading spinner while generating
- Call `exportRunningSheetPDF(data.items, eventObj, 'Running Sheet', null)`
- Construct a minimal event object from the available public data (name, date, venue)
- Download the PDF with the same filename format and identical output

## File Changed

| File | Change |
|------|--------|
| `src/pages/RunningSheetPublicView.tsx` | Update header text, replace Print button with Download PDF using `exportRunningSheetPDF` |

## Technical Details

- Import `exportRunningSheetPDF` from `@/lib/runningSheetPdfExporter`
- Import `Loader2` and `Download` icons from lucide-react
- Add `downloadingPDF` state
- Build a minimal event object: `{ id: data.event_id, name: data.event_name, date: data.event_date, venue: data.event_venue }` to pass to the exporter
- The PDF output will be identical to what the dashboard produces
