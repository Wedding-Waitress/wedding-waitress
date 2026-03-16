

## Fix Event Date Reset Position

**Bug**: The Event Date preset zone's field name is `'date'` (in `PRESET_ZONES`), but `PRESET_Y_POSITIONS` maps it as `'event_date'`. This mismatch means the Y position lookup returns `undefined`, defaulting to 50% instead of 42%.

**Fix**: In `InvitationCardCustomizer.tsx` line 140, change the key from `event_date` to `date`:

```ts
export const PRESET_Y_POSITIONS: Record<string, number> = {
  you_are_invited: 14,
  event_name: 26,
  date: 42,            // was 'event_date' — must match PRESET_ZONES field
  ceremony_info: 52,
  reception_info: 62,
  dress_code: 72,
  rsvp_deadline: 82,
};
```

Single line change, one file.

