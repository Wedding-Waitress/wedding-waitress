

# Fix DJ-MC Public View PDF Download + Add Logo to All PDF Exports

## Problem Summary
1. The "Download PDF" button on the DJ-MC public share view calls `window.print()`, which produces blank pages
2. The DJ-MC PDF exporter uses an old logo (`/jpeg-2.jpg`) instead of the proper Wedding Waitress logo (`/wedding-waitress-share-logo.png`)
3. The Wedding Waitress logo needs to appear at the bottom of all PDF downloads

## Changes Required

### 1. Database Migration: Extend RPC Return Fields
**Function**: `get_dj_mc_questionnaire_by_token`

The current function only returns `event_name`, `event_date`, `event_venue`. The PDF exporter needs `start_time`, `finish_time`, `ceremony_date`, `ceremony_venue`, `ceremony_start_time`, and `ceremony_finish_time`.

Drop and recreate the function with the expanded return signature, adding these 6 fields from the `events` table join.

### 2. Update Supabase Types
**File**: `src/integrations/supabase/types.ts` (lines 2284-2295)

Add the 6 new return fields to the `get_dj_mc_questionnaire_by_token` type definition:
- `start_time`, `finish_time`, `ceremony_date`, `ceremony_venue`, `ceremony_start_time`, `ceremony_finish_time`

### 3. Fix DJ-MC Public View PDF Download
**File**: `src/pages/DJMCPublicView.tsx`

- Add new fields to `PublicQuestionnaireData` interface (`start_time`, `finish_time`, `ceremony_date`, `ceremony_venue`, `ceremony_start_time`, `ceremony_finish_time`)
- Import `exportEntireQuestionnairePDF` from `@/lib/djMCQuestionnairePdfExporter`
- Add `downloadingPDF` state
- Replace `handlePrint` (`window.print()`) with a proper handler that constructs the event and questionnaire objects and calls `exportEntireQuestionnairePDF`
- Update data parsing to include the new event fields from the RPC response
- Add loading spinner to the Download PDF button while generating

### 4. Update DJ-MC PDF Exporter Logo
**File**: `src/lib/djMCQuestionnairePdfExporter.ts`

- Change `loadLogoAsBase64` to use `/wedding-waitress-share-logo.png` instead of `/jpeg-2.jpg`
- This single change fixes the logo for both "Download entire questionnaire PDF" from the dashboard AND the new public view PDF download

## Technical Flow

The public view Download PDF button will:
1. Set loading state
2. Construct event object from RPC data (including times/venues)
3. Construct questionnaire object with sections
4. Call `exportEntireQuestionnairePDF(questionnaire, event)`
5. jsPDF generates multi-page A4 PDF with all sections, matching the dashboard export
6. PDF includes Wedding Waitress logo at bottom of last page

