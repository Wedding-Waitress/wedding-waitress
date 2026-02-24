

# Add "Share with..." to Full Seating Chart Export Controls

## Overview
Add a "Share with..." button to the Full Seating Chart's Export Controls, following the exact same sharing pattern used in the Running Sheet and DJ-MC Questionnaire. When a recipient opens the shared link, they will see the event's seating chart data and have options to download a single-page or all-pages PDF.

## What's Being Built

1. **"Share with..." button** in the Export Controls box (left of the download buttons)
2. **Share modal** (same design as Running Sheet's) for generating/managing share links
3. **Database table** `seating_chart_share_tokens` for storing share tokens
4. **Database function** `generate_seating_chart_share_token` for secure token generation
5. **Database function** `get_seating_chart_by_token` to retrieve event + guest data for shared links
6. **Public view page** at `/seating-chart/:token` where recipients can view and download the PDF
7. **Hook** `useSeatingChartShare` for token CRUD operations
8. **URL builder** `buildSeatingChartUrl` in urlUtils.ts

## Technical Details

### 1. Database Migration -- New Table

```sql
CREATE TABLE seating_chart_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL,
  recipient_name TEXT,
  permission TEXT NOT NULL DEFAULT 'view_only',
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

With RLS policies allowing only the event owner to manage their tokens.

### 2. Database Function -- Token Generation

`generate_seating_chart_share_token(_event_id, _permission, _recipient_name, _validity_days)`
- Verifies user owns the event
- Generates URL-safe token (same pattern as running sheet: base64 without padding)
- Returns the token string

### 3. Database Function -- Public Data Retrieval

`get_seating_chart_by_token(share_token)`
- Validates token and expiry (handles stripped base64 padding)
- Updates `last_accessed_at`
- Returns: event name, date, venue, permission, and full guest list (id, first_name, last_name, table_no, seat_no, dietary, relation_display, rsvp)

### 4. Frontend Hook -- `useSeatingChartShare.ts`

Located at `src/hooks/useSeatingChartShare.ts`
- `shareTokens` state
- `fetchShareTokens(eventId)` -- loads existing tokens
- `generateShareToken(eventId, recipientName)` -- calls RPC, copies link
- `deleteShareToken(tokenId)` -- removes token

### 5. Share Modal -- `SeatingChartShareModal.tsx`

Located at `src/components/Dashboard/FullSeatingChart/SeatingChartShareModal.tsx`
- Mirrors `RunningSheetShareModal` exactly
- Two tabs: "Create Link" and "Manage"
- Recipient name input, generate + copy button
- List existing tokens with copy/open/delete actions

### 6. URL Utility

Add to `src/lib/urlUtils.ts`:
```
buildSeatingChartUrl(token) => `${baseUrl}/seating-chart/${encodeURIComponent(token)}`
```

### 7. Public View Page -- `SeatingChartPublicView.tsx`

Located at `src/pages/SeatingChartPublicView.tsx`
- Route: `/seating-chart/:token`
- Header: "You have been invited to view and download the full seating chart of [Event Name]"
- "View Only" badge (red tablet button)
- Two green tablet buttons: "Download single page PDF" and "Download all pages PDF"
- Guest list displayed in a table (sorted by first name)
- Footer with Wedding Waitress logo + "Powered by" link
- Uses `exportFullSeatingChartToPdf` for downloads (with default settings)

### 8. Dashboard Integration

In `FullSeatingChartPage.tsx`:
- Add `Share2` icon import
- Add share modal state and hook
- Add "Share with..." green tablet button to the left of existing download buttons in Export Controls
- Render `SeatingChartShareModal` component

### 9. Route Registration

In `App.tsx`:
- Import `SeatingChartPublicView`
- Add route: `<Route path="/seating-chart/:token" element={<SeatingChartPublicView />} />`

## Files to Create
- `src/hooks/useSeatingChartShare.ts`
- `src/components/Dashboard/FullSeatingChart/SeatingChartShareModal.tsx`
- `src/pages/SeatingChartPublicView.tsx`

## Files to Modify
- `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` -- add share button + modal
- `src/lib/urlUtils.ts` -- add `buildSeatingChartUrl`
- `src/App.tsx` -- add public route
- Database migration for table + functions + RLS

