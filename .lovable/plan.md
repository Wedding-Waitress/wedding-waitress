

## Connect Preset Zones to Full Event Data

**Problem**: Ceremony/Reception presets only show venue name and times, but miss the address. Dress Code is hardcoded. Event data has `venue_address` and `ceremony_venue_address` fields that aren't being passed through.

### Changes

**File 1: `src/components/Dashboard/Invitations/InvitationsPage.tsx`** (~line 80-95)

Add address fields to `eventData`:
```ts
venue_address: selectedEvent.venue_address || '',
ceremony_venue_address: selectedEvent.ceremony_venue_address || '',
```

**File 2: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`** (lines 52-78)

Update `getText` for Ceremony Info and Reception Info to include address and use dash separator:

- **Ceremony Info**: `Ceremony - [venue], [address], [startTime] — [endTime]`
- **Reception Info**: `Reception - [venue], [address], [startTime] — [endTime]`

Updated getText functions:
```ts
// Ceremony Info
getText: (ed) => {
  const venue = ed.ceremony_venue || '';
  const address = ed.ceremony_venue_address || '';
  const location = [venue, address].filter(Boolean).join(', ');
  const timeRange = ed.ceremony_time && ed.ceremony_finish_time
    ? `${ed.ceremony_time} — ${ed.ceremony_finish_time}`
    : ed.ceremony_time || '';
  const details = [location, timeRange].filter(Boolean).join(', ');
  return `Ceremony - ${details}`;
},

// Reception Info
getText: (ed) => {
  const venue = ed.venue || '';
  const address = ed.venue_address || '';
  const location = [venue, address].filter(Boolean).join(', ');
  const timeRange = ed.time && ed.finish_time
    ? `${ed.time} — ${ed.finish_time}`
    : ed.time || '';
  const details = [location, timeRange].filter(Boolean).join(', ');
  return `Reception - ${details}`;
},
```

No other changes needed — Event Name, Event Date, and RSVP Deadline already pull from event data correctly. Dress Code stays hardcoded as there's no dress_code field on the event.

