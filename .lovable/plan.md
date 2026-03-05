

## Plan: Redesign Preset Zone Buttons in Text Zones Tab

### Summary

Replace the current 5 preset zone buttons (Couple Names, Event Date, Event Location, Event Time, RSVP Deadline) with a new set of 6 buttons in a specific order, with ceremony/reception buttons being conditionally enabled based on event settings.

### New Preset Zones (in order, 5 per row + 1 on second row)

1. **Event Name** - Populates with the event name
2. **Event Date** - Populates with the event date (unchanged)
3. **Ceremony Info** - Populates with "Ceremony\n{ceremony_venue}\n{ceremony_start_time}". Disabled (greyed out, not clickable) if `ceremony_enabled` is false on the selected event.
4. **Reception Info** - Populates with "Reception\n{venue}\n{start_time}". Disabled if `reception_enabled` is false.
5. **Dress Code** - Populates with "Formal - Dress to Impress"
6. **RSVP Deadline** - Populates with the RSVP deadline date (unchanged)

### File Changes

#### 1. `src/components/Dashboard/Invitations/InvitationsPage.tsx`
- Expand the `eventData` object to include: `event_name`, `ceremony_enabled`, `ceremony_venue`, `ceremony_start_time`, `reception_enabled`, `reception_venue` (uses main `venue`), `reception_start_time` (uses main `start_time`).

#### 2. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- Replace `PRESET_ZONES` array with the new 6 zones.
- Add a `disabled` callback property to each zone definition that checks `eventData` for ceremony/reception enabled status.
- Ceremony Info button: disabled when `eventData.ceremony_enabled !== 'true'`.
- Reception Info button: disabled when `eventData.reception_enabled !== 'true'`.
- When added, Ceremony Info zone text = `"Ceremony\n{ceremony_venue}, {ceremony_time}"`. Reception Info zone text = `"Reception\n{venue}, {time}"`. Dress Code zone text = `"Formal - Dress to Impress"`.
- Keep the `flex flex-wrap gap-2` layout which will naturally fit 5 buttons on one row given the shorter labels.

#### 3. `src/components/Dashboard/Invitations/InvitationCardPreview.tsx`
- No changes needed; it already renders `zone.text` or falls back to `eventData[zone.preset_field]`.

### Removed Preset Zones
- "Couple Names" (removed)
- "Event Location" (removed, replaced by Ceremony/Reception info)
- "Event Time" (removed, replaced by Ceremony/Reception info)

