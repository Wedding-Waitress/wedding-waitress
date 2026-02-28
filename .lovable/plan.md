

# Multi-Artwork Saved Designs for Invitations

## Overview

Expand the `invitation_card_settings` table and UI to support multiple saved artworks per event. Each artwork has a `card_type` (invitation, save_the_date, thank_you) and a user-given name. Users can create, switch between, and manage multiple designs per event.

## Database Changes

Add two new columns to `invitation_card_settings`:

```sql
ALTER TABLE invitation_card_settings
  ADD COLUMN card_type text NOT NULL DEFAULT 'invitation',
  ADD COLUMN name text NOT NULL DEFAULT 'Untitled';
```

- `card_type`: one of `'invitation'`, `'save_the_date'`, `'thank_you'` -- this is the functional type, NOT a category
- `name`: user-editable label (e.g. "Main Wedding Invitation", "George's Save the Date")

Drop the current implicit one-per-event constraint so multiple rows per event are allowed (already the case -- no unique constraint on event_id exists).

## Hook Changes (`useInvitationCardSettings.ts`)

- Change from fetching `.maybeSingle()` to fetching all rows for the event (`.select('*').eq('event_id', eventId)`)
- Maintain a list of all saved artworks: `artworks: InvitationCardSettings[]`
- Add `activeArtworkId` state to track which design is currently being edited
- Expose `activeArtwork` (the currently selected one) plus CRUD methods:
  - `createArtwork(cardType, name)` -- inserts a new row
  - `deleteArtwork(id)` -- removes a saved design
  - `duplicateArtwork(id)` -- clones an existing design
  - `renameArtwork(id, name)` -- updates the name
  - `setActiveArtwork(id)` -- switches the editor to a different saved design
  - `updateSettings(partial)` -- updates the active artwork (existing behavior)

## Interface Changes (`InvitationCardSettings`)

Add to the TypeScript interface:
```typescript
card_type: 'invitation' | 'save_the_date' | 'thank_you';
name: string;
```

## UI Changes

### InvitationsPage.tsx

Add a "Saved Artworks" management bar between the header card and the customizer/preview grid:

- **Card Type Tabs**: Three toggle buttons -- "Invitation", "Save the Date", "Thank You" -- to filter displayed artworks
- **Artwork List**: Horizontal scrollable row of artwork cards (thumbnail + name), click to select
- **New Artwork Button**: "+ New [Invitation/Save the Date/Thank You]" creates a blank design of that type
- **Actions per artwork**: Rename, Duplicate, Delete (via small dropdown or icon buttons)

The customizer and preview then work on the currently active/selected artwork exactly as they do now.

### InvitationCardCustomizer.tsx

- Show the artwork name as an editable field at the top of the customizer
- Show the card type as a read-only badge

## Files Modified

1. **Migration SQL** -- Add `card_type` and `name` columns
2. **`src/hooks/useInvitationCardSettings.ts`** -- Rewrite to support multiple artworks per event
3. **`src/components/Dashboard/Invitations/InvitationsPage.tsx`** -- Add artwork management bar with card type tabs and artwork selector
4. **`src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`** -- Add artwork name field and card type badge at top

## Data Flow

1. User selects event -> hook fetches all artworks for that event
2. User picks a card type tab (Invitation / Save the Date / Thank You) -> filters visible artworks
3. User clicks an artwork card or creates new -> sets active artwork
4. Customizer and preview bind to the active artwork
5. All changes auto-save to that specific artwork row via `updateSettings()`

