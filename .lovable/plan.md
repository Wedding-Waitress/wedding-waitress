

## Adjust Preset Zone Vertical Spacing

**File**: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` (lines 137-145)

Update `PRESET_Y_POSITIONS` to:
- Keep 12% gap between You Are Invited → Event Name → Event Date (unchanged)
- From Event Date onwards, use 10% gap (≈ two blank lines) instead of the current 6%

```ts
const PRESET_Y_POSITIONS: Record<string, number> = {
  you_are_invited: 14,  // unchanged
  event_name: 26,       // unchanged (gap 12)
  event_date: 38,       // unchanged (gap 12)
  ceremony_info: 48,    // was 44 → +10 from event_date
  reception_info: 58,   // was 50 → +10
  dress_code: 68,       // was 56 → +10
  rsvp_deadline: 78,    // was 62 → +10
};
```

