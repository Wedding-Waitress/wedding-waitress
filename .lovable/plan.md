

# Consolidate Invitation Text Zones: Combined Ceremony and Reception

## Overview
Reduce the default invitation template from 12 text zones to 6, combining ceremony and reception details into single auto-filled zones with a specific two-line format.

## New Zone Layout (6 zones)
1. **Welcome Message** (custom) -- keep as-is
2. **Couple Names** (auto: couple_names) -- keep as-is
3. **Ceremony** (auto: ceremony) -- NEW combined zone
4. **Reception** (auto: reception) -- NEW combined zone
5. **RSVP Details** (auto: rsvp_deadline) -- keep as-is
6. **Notes** (custom) -- keep as-is

**Removed:** Ceremony Date, Ceremony Time, Ceremony Venue (3 separate zones), Reception Date, Reception Time, Reception Venue (3 separate zones), Dress Code, Guest Name.

## Auto-Fill Format

**Ceremony zone** will render as:
```
Ceremony - Date: 20/12/2026 - Time: 3:30 PM -- 5:55 PM
Location: Sheldon Receptions - 608-614 Somerville Road, Sunshine West Vic 3020
```

**Reception zone** will render as:
```
Reception - Date: 20/12/2026 - Time: 6:00 PM -- 11:00 PM
Location: Sheldon Receptions - 608-614 Somerville Road, Sunshine West Vic 3020
```

The venue name and venue address are combined on the Location line, separated by " - ".

## Technical Changes

### 1. Expand auto_field type (`src/hooks/useInvitationTemplates.ts`)
Add two new auto_field values: `'ceremony'` and `'reception'` to the union type.

### 2. Expand eventData mapping (`src/components/Dashboard/Invitations/InvitationsPage.tsx`)
Add these new fields from the selected event:
- `ceremony_finish_time` -- from `selectedEvent.ceremony_finish_time`
- `reception_finish_time` -- from `selectedEvent.finish_time`
- `ceremony_venue_address` -- from `selectedEvent.ceremony_venue_address`
- `venue_address` -- from `selectedEvent.venue_address`
- `ceremony` -- pre-formatted combined string using the exact two-line format
- `reception` -- pre-formatted combined string using the exact two-line format

The formatting logic will build the string like:
```typescript
const ceremony = [
  `Ceremony - Date: ${formatDisplayDate(event.ceremony_date)} - Time: ${formatDisplayTime(event.ceremony_start_time)} — ${formatDisplayTime(event.ceremony_finish_time)}`,
  `Location: ${[event.ceremony_venue, event.ceremony_venue_address].filter(Boolean).join(' - ')}`
].join('\n');
```

### 3. Update default zones (`src/components/Admin/AdminInvitationTemplates.tsx`)
Replace the 12-zone invitation layout with the new 6-zone layout:
- Welcome (y: 10%), Couple Names (y: 20%), Ceremony (y: 35%, auto_field: 'ceremony'), Reception (y: 50%, auto_field: 'reception'), RSVP (y: 65%), Notes (y: 78%)
- Ceremony and Reception zones get `max_lines: 3` to accommodate two lines of text

### 4. Add auto_field options in admin editor (`src/components/Admin/TemplateTextZoneEditor.tsx`)
Add `'ceremony'` and `'reception'` to the AUTO_FIELDS dropdown so admins can assign them.

### 5. Preview rendering (`src/components/Dashboard/Invitations/InvitationPreview.tsx`)
No structural changes needed -- the preview already resolves `eventData[zone.auto_field]` for any auto field. The new `ceremony` and `reception` keys will be resolved automatically. The `whitespace-pre-wrap` CSS class already handles the newline character in the combined string.

### 6. Customizer (`src/components/Dashboard/Invitations/InvitationCustomizer.tsx`)
No structural changes needed -- the auto zone input already shows the auto-filled value as a placeholder and allows overrides.

## Files Modified
1. `src/hooks/useInvitationTemplates.ts` -- add `'ceremony'` and `'reception'` to auto_field union
2. `src/components/Dashboard/Invitations/InvitationsPage.tsx` -- build combined ceremony/reception strings in eventData
3. `src/components/Admin/AdminInvitationTemplates.tsx` -- replace 12-zone default with 6-zone default
4. `src/components/Admin/TemplateTextZoneEditor.tsx` -- add new AUTO_FIELDS entries

## Important Notes
- Existing templates already saved in the database will NOT be affected -- they keep their current zones. Only newly created templates will use the 6-zone default.
- The user can still override the auto-filled text by typing in the customizer input field.
- The combined format uses a newline character so it displays on two lines in the preview (supported by `whitespace-pre-wrap`).

