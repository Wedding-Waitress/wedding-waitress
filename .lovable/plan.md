

# Fix Running Sheet PDF from Share Link — Missing Time/Ceremony Data

## Problem
The PDF downloaded from the shared link shows "TBD -- TBD" for times because the database function `get_running_sheet_by_token` only returns `event_name`, `event_date`, and `event_venue`. It does not return `start_time`, `finish_time`, `ceremony_date`, `ceremony_venue`, `ceremony_start_time`, or `ceremony_finish_time` -- all of which the PDF exporter needs to build the correct header.

## Solution

### 1. Update the database function
**Migration:** Create a new migration to update `get_running_sheet_by_token` so it also returns the six missing fields from the events table:
- `start_time`
- `finish_time`
- `ceremony_date`
- `ceremony_venue`
- `ceremony_start_time`
- `ceremony_finish_time`

### 2. Update the Supabase types
**File:** `src/integrations/supabase/types.ts`

Add the six new return fields to the `get_running_sheet_by_token` type definition so TypeScript knows about them.

### 3. Update the public view page
**File:** `src/pages/RunningSheetPublicView.tsx`

- Add the six new fields to the `RunningSheetData` interface
- Pass them through when constructing the event object for `exportRunningSheetPDF`
- Also display the correct ceremony/reception info in the page header banner (replacing the current date/venue display with the same detailed lines the PDF shows)

### 4. Update header text
**File:** `src/pages/RunningSheetPublicView.tsx`

Change "You have been invited to view or print the running sheet of" to "You have been invited to view and download the running sheet of" (this was requested previously but the current file still has the old wording based on the code shown).

## Summary of Changes

| File | Change |
|------|--------|
| New SQL migration | Update `get_running_sheet_by_token` to return 6 additional event time fields |
| `src/integrations/supabase/types.ts` | Add 6 fields to the RPC return type |
| `src/pages/RunningSheetPublicView.tsx` | Pass all event fields to PDF exporter; update header wording |

## Technical Details

The updated RPC function will change its `RETURNS TABLE` to include:

```text
start_time time,
finish_time time,
ceremony_date date,
ceremony_venue text,
ceremony_start_time time,
ceremony_finish_time time
```

And the SELECT will add:

```text
e.start_time,
e.finish_time,
e.ceremony_date,
e.ceremony_venue,
e.ceremony_start_time,
e.ceremony_finish_time
```

The event object passed to `exportRunningSheetPDF` will then include all required fields, producing a PDF identical to the dashboard's "Download Entire Running Sheet PDF" output.
