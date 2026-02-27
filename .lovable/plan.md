

# Fix Auto-Fill and Visibility for Invitation Text Zones

## Problems Identified

1. Auto-filled zones (Couple Names, Ceremony Date/Time/Venue) show "Auto-filled from event" label but have no input, so users cannot see or override the value
2. The `eventData` only maps 4 fields (couple_names, date, venue, time) but doesn't include ceremony-specific or reception-specific event data
3. Reception Date/Time/Venue zones are set as "custom" type -- they don't pull from event data at all
4. The auto_field type only supports 4 values, missing ceremony and reception variants plus RSVP

## Plan

### 1. Expand auto_field options (`src/hooks/useInvitationTemplates.ts`)
Add new auto_field values to the TextZone interface:
- `ceremony_date`, `ceremony_time`, `ceremony_venue`
- `reception_date`, `reception_time`, `reception_venue`
- `rsvp_deadline`

### 2. Add matching AUTO_FIELDS in admin editor (`src/components/Admin/TemplateTextZoneEditor.tsx`)
Add the new auto field options so admins can assign them to zones.

### 3. Expand eventData in InvitationsPage (`src/components/Dashboard/Invitations/InvitationsPage.tsx`)
Pull ceremony and reception fields from the selected event:
- `ceremony_date` from `selectedEvent.ceremony_date`
- `ceremony_time` from `selectedEvent.ceremony_start_time`
- `ceremony_venue` from `selectedEvent.ceremony_venue`
- `reception_date` from `selectedEvent.date`
- `reception_time` from `selectedEvent.start_time`
- `reception_venue` from `selectedEvent.venue`
- `rsvp_deadline` from `selectedEvent.rsvp_deadline`

Keep existing `date`, `venue`, `time` as-is for backward compatibility.

### 4. Update InvitationPreview eventData interface (`src/components/Dashboard/Invitations/InvitationPreview.tsx`)
Widen the eventData type to accept any string key so all new auto fields resolve correctly.

### 5. Make auto zones editable in the Customizer (`src/components/Dashboard/Invitations/InvitationCustomizer.tsx`)
Replace the static "Auto-filled from event" text with an Input field that:
- Shows the auto-filled value as a placeholder
- Lets the user type a custom override
- When cleared, reverts to the auto-filled value
- Shows a small "Auto" badge so users know the source

### 6. Update default zone templates (`src/components/Admin/AdminInvitationTemplates.tsx`)
Change Reception Date/Time/Venue from `custom` to `auto` type with the new auto_field values (`reception_date`, `reception_time`, `reception_venue`). Similarly update Ceremony zones to use the specific ceremony auto fields instead of generic `date`/`time`/`venue`.

### 7. Update font size slider max
Change the user-facing font size slider max from 72 to 150 (matching the admin editor).

## Files Modified
1. `src/hooks/useInvitationTemplates.ts` -- expand auto_field type
2. `src/components/Admin/TemplateTextZoneEditor.tsx` -- add new AUTO_FIELDS entries
3. `src/components/Dashboard/Invitations/InvitationsPage.tsx` -- expand eventData
4. `src/components/Dashboard/Invitations/InvitationPreview.tsx` -- widen eventData type
5. `src/components/Dashboard/Invitations/InvitationCustomizer.tsx` -- make auto zones editable, update slider max
6. `src/components/Admin/AdminInvitationTemplates.tsx` -- update default zone auto_field values

