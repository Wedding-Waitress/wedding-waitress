

## Fix "Failed to save settings" Error in Place Cards

### Root Cause

When place card settings don't exist yet for an event (first save), the `updateSettings` function does an INSERT with only `event_id`, `user_id`, and the single changed field (e.g., `{ guest_name_bold: true }`). While the DB columns have `DEFAULT 0`, the error `null value in column "guest_name_offset_x" violates not-null constraint` suggests PostgREST is explicitly sending null for columns not included in the payload, overriding the DB defaults.

### Fix

In `src/hooks/usePlaceCardSettings.ts`, when creating new settings (the INSERT path, ~line 147-153), provide explicit defaults for all required fields so the insert always succeeds:

```typescript
const settingsData = {
  event_id: eventId,
  user_id: user.id,
  // Provide defaults for all required fields on insert
  ...(settings?.id ? {} : {
    font_family: 'Great Vibes',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_type: 'none',
    mass_message: '',
    individual_messages: {},
    guest_font_family: 'Great Vibes',
    info_font_family: 'Beauty Mountains',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 40,
    info_font_size: 16,
    name_spacing: 0,
    info_bold: false,
    info_italic: false,
    info_underline: false,
    info_font_color: '#000000',
    guest_name_offset_x: 0,
    guest_name_offset_y: 0,
    table_offset_x: 0,
    table_offset_y: 0,
    seat_offset_x: 0,
    seat_offset_y: 0,
    guest_name_rotation: 0,
    table_seat_rotation: 0,
    message_font_family: 'Beauty Mountains',
    message_font_size: 16,
    message_font_color: '#000000',
    message_bold: false,
    message_italic: false,
    message_underline: false,
  }),
  ...newSettings,
};
```

This ensures the INSERT always includes values for all NOT NULL columns, with the user's change applied on top via `...newSettings`.

### Scope
- Single file change: `src/hooks/usePlaceCardSettings.ts` (~15 lines modified around the `settingsData` construction)

