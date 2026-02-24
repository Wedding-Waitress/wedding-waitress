

# Fix DJ-MC Public View PDF Download and Add Logo to PDF Exports

## Problem
1. The "Download PDF" button on the DJ-MC public view uses `window.print()`, which produces empty/blank pages
2. The DJ-MC PDF exporter uses an old logo (`/jpeg-2.jpg`) instead of the proper Wedding Waitress logo
3. The logo needs to appear at the bottom of all PDF downloads (DJ-MC questionnaire and running sheet)

## Changes

### 1. Update the Database RPC Function
The `get_dj_mc_questionnaire_by_token` function currently only returns `event_name`, `event_date`, `event_venue`. It needs to also return `start_time`, `finish_time`, `ceremony_date`, `ceremony_venue`, `ceremony_start_time`, and `ceremony_finish_time` so the public view can generate a proper PDF with full event details.

**Database migration**: Recreate the function adding these six fields to the return value from the events table join.

### 2. Update DJ-MC Public View to Use Real PDF Export
**File**: `src/pages/DJMCPublicView.tsx`

- Import `exportEntireQuestionnairePDF` from the DJ-MC PDF exporter
- Replace `window.print()` with a call to `exportEntireQuestionnairePDF`, constructing an event object from the RPC data (including the new time/venue fields)
- Add `downloadingPDF` state with a loading spinner on the button while generating
- Update the `PublicQuestionnaireData` interface to include the new event fields
- Build a `DJMCQuestionnaire` object from `data.sections` to pass to the exporter

### 3. Update DJ-MC PDF Exporter Logo
**File**: `src/lib/djMCQuestionnairePdfExporter.ts`

- Change the logo from `/jpeg-2.jpg` to the proper Wedding Waitress logo (`/wedding-waitress-share-logo.png`) so the branded logo appears at the bottom of every exported PDF
- This affects both "Download entire questionnaire PDF" from the dashboard AND the new public view PDF download

### 4. Update Supabase Types
**File**: `src/integrations/supabase/types.ts`

- Add the new return fields (`start_time`, `finish_time`, `ceremony_date`, `ceremony_venue`, `ceremony_start_time`, `ceremony_finish_time`) to the `get_dj_mc_questionnaire_by_token` type definition

## Technical Detail

The public view will construct the event and questionnaire objects from the RPC data:

```text
event = {
  id: data.event_id,
  name: data.event_name,
  date: data.event_date,
  venue: data.event_venue,
  start_time: data.start_time,       // NEW
  finish_time: data.finish_time,     // NEW
  ceremony_date: data.ceremony_date, // NEW
  ...etc
}

questionnaire = {
  id: data.questionnaire_id,
  sections: data.sections
}
```

The Download PDF button will show a loading state while generating, matching the running sheet pattern.
