
# Fix Running Sheet Share Links

## Problem
When clicking "Open Link" in the Share Running Sheet modal, two things go wrong:
1. The URL points to the Lovable domain instead of weddingwaitress.com
2. There is no public view page for shared running sheets, so it hits a 404

## Solution

### 1. Create a Public Running Sheet View Page
**New file:** `src/pages/RunningSheetPublicView.tsx`

Create a read-only public page (similar to the DJ-MC public view) that:
- Reads the share token from the URL parameter
- Calls the existing `get_running_sheet_by_token` RPC function (already exists in the database)
- Displays the event name, date, venue at the top
- Renders the running sheet items in a clean table format (Time, Event, Who columns)
- Highlights section header rows in bold red (matching the dashboard and PDF styling)
- Shows loading, error, and expired/invalid link states
- Includes the Wedding Waitress logo and branding
- Has a print button for convenience
- Fully responsive for mobile

### 2. Add Route to App.tsx
**File:** `src/App.tsx`

Add a new route: `/running-sheet/:token` pointing to `RunningSheetPublicView`

### 3. Fix Share URLs to Use Production Domain
**File:** `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx`

Replace all instances of `window.location.origin` with `getPublicBaseUrl()` from `src/lib/urlUtils.ts`, and use the new `buildRunningSheetUrl()` helper. This ensures share links always point to weddingwaitress.com, not the Lovable preview domain.

### 4. Add URL Builder Helper
**File:** `src/lib/urlUtils.ts`

Add a `buildRunningSheetUrl(token)` function following the same pattern as `buildDJQuestionnaireUrl()`.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/RunningSheetPublicView.tsx` | New file -- public read-only view for shared running sheets |
| `src/App.tsx` | Add `/running-sheet/:token` route |
| `src/components/Dashboard/RunningSheet/RunningSheetShareModal.tsx` | Use `buildRunningSheetUrl()` instead of `window.location.origin` |
| `src/lib/urlUtils.ts` | Add `buildRunningSheetUrl()` helper |

## Technical Notes

- The `get_running_sheet_by_token` RPC function already exists in the database and returns: event_name, event_date, event_venue, items (JSON), permission, sheet_id
- The public view page follows the exact same pattern as `DJMCPublicView.tsx` for consistency
- No database or schema changes needed
- The `VITE_PUBLIC_BASE_URL` is already set to `https://weddingwaitress.com` so all share links will correctly use the production domain
