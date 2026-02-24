

# Update Share Link URLs to Include Event Name

## What's Changing

The share links for **Running Sheet** and **DJ-MC Questionnaire** will change from long token-only URLs to human-readable URLs that include the page name and event name.

**Before:**
- `weddingwaitress.com/running-sheet/aBcDeFgH1234...`
- `lovableproject.com/dj-mc/xYzAbCdE5678...`

**After:**
- `weddingwaitress.com/running-sheet/jason-lindas-wedding/aBcDeFgH1234...`
- `weddingwaitress.com/dj-mc/jason-lindas-wedding/xYzAbCdE5678...`

The event slug (e.g. "jason-lindas-wedding") appears in the URL so recipients can see which event it belongs to. The token remains in the URL for security/access control, but now follows the event name. All links will use the production domain (weddingwaitress.com).

## Technical Details

### 1. Add new routes in `src/App.tsx`

Add routes with the pattern `/:pageName/:eventSlug/:token` alongside the existing token-only routes (for backward compatibility with old links):

- `/running-sheet/:eventSlug/:token` (new)
- `/running-sheet/:token` (keep for old links)
- `/dj-mc/:eventSlug/:token` (new)
- `/dj-mc/:token` (keep for old links)
- `/djmc/:eventSlug/:token` (new)
- `/djmc/:token` (keep for old links)

### 2. Update URL builder functions in `src/lib/urlUtils.ts`

- `buildRunningSheetUrl(token, eventSlug)` -- produces `weddingwaitress.com/running-sheet/event-slug/token`
- Add `buildDJQuestionnaireUrl(token, eventSlug)` -- produces `weddingwaitress.com/dj-mc/event-slug/token`

### 3. Pass event slug to share modals

- **RunningSheetPage.tsx**: Pass `selectedEvent?.slug` as a new `eventSlug` prop to `RunningSheetShareModal`
- **DJMCQuestionnairePage.tsx**: Pass `selectedEvent?.slug` as a new `eventSlug` prop to `DJMCShareModal`

### 4. Update `RunningSheetShareModal.tsx`

- Accept new `eventSlug` prop
- Use `buildRunningSheetUrl(token, eventSlug)` for all link generation (generate, copy, open)

### 5. Update `DJMCShareModal.tsx`

- Accept new `eventSlug` prop
- Replace `window.location.origin` with `getPublicBaseUrl()` (weddingwaitress.com)
- Use `buildDJQuestionnaireUrl(token, eventSlug)` for all link generation (generate, copy, open)

### 6. Update public view pages to read token from new routes

- **RunningSheetPublicView.tsx**: Read `token` param (works from either route pattern since the last segment is always the token)
- **DJMCPublicView.tsx**: Same approach

The old token-only routes remain functional so previously shared links continue to work.
