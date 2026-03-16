

## Update Preset Text Zone Formatting

**Goal**: Change how preset zones generate their text content when added to the invitation.

**File 1**: `src/components/Dashboard/Invitations/InvitationsPage.tsx` (lines 80-91)

Add raw date/time fields to eventData so the preset `getText` functions can format them properly:

```ts
return {
  couple_names: coupleNames,
  event_name: selectedEvent.name || '',
  date: selectedEvent.date ? formatDisplayDate(selectedEvent.date) : '',
  date_raw: selectedEvent.date || '',
  venue: selectedEvent.venue || '',
  time: selectedEvent.start_time ? formatDisplayTime(selectedEvent.start_time) : '',
  finish_time: selectedEvent.finish_time ? formatDisplayTime(selectedEvent.finish_time) : '',
  rsvp_deadline: selectedEvent.rsvp_deadline ? formatDisplayDate(selectedEvent.rsvp_deadline) : '',
  rsvp_deadline_raw: selectedEvent.rsvp_deadline || '',
  ceremony_enabled: selectedEvent.ceremony_enabled ? 'true' : 'false',
  ceremony_venue: selectedEvent.ceremony_venue || '',
  ceremony_time: selectedEvent.ceremony_start_time ? formatDisplayTime(selectedEvent.ceremony_start_time) : '',
  ceremony_finish_time: selectedEvent.ceremony_finish_time ? formatDisplayTime(selectedEvent.ceremony_finish_time) : '',
  reception_enabled: selectedEvent.reception_enabled ? 'true' : 'false',
};
```

**File 2**: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` (lines 30-53)

Add a helper function for ordinal date formatting and update the `getText` functions in `PRESET_ZONES`:

```ts
const formatOrdinalDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate();
  const suffix = (day > 3 && day < 21) ? 'th' : ['th','st','nd','rd'][day % 10] || 'th';
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday}, the ${day}${suffix} of ${month} ${year}`;
};
```

Updated preset definitions:

- **Event Date**: `getText: (ed) => \`Event Date - ${formatOrdinalDate(ed.date_raw)}\``
- **Ceremony Info**: `getText: (ed) => \`Ceremony\n${ed.ceremony_venue}${timeRange}\`` where timeRange uses ceremony_time and ceremony_finish_time (e.g. "3:30 PM - 5:55 PM")
- **Reception Info**: `getText: (ed) => \`Reception\n${ed.venue}${timeRange}\`` where timeRange uses time and finish_time
- **Dress Code**: Keep as `getText: () => 'Dress Code - Formal / Dress to Impress'`
- **RSVP Deadline**: `getText: (ed) => \`RSVP Deadline - ${formatOrdinalDate(ed.rsvp_deadline_raw)}\``

**No other functionality changes.** Event Name preset remains unchanged.

