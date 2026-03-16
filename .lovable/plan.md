

## Fix Preset Zone Default Positions

**File**: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` (lines 137-145)

**Problem**: Current `event_date` is at 38%, but the screenshot shows it needs more visual whitespace below the large 56px "Event Name" font. The positions need to match the screenshot reference.

**Change**: Update `PRESET_Y_POSITIONS` to place Event Date at 42% (16% gap from Event Name to compensate for its large font size), then cascade remaining zones at consistent 10% intervals:

```ts
const PRESET_Y_POSITIONS: Record<string, number> = {
  you_are_invited: 14,   // unchanged
  event_name: 26,        // 12% gap
  event_date: 42,        // was 38 → 16% gap (accounts for large 56px font above)
  ceremony_info: 52,     // was 48 → 10% gap
  reception_info: 62,    // was 58 → 10% gap
  dress_code: 72,        // was 68 → 10% gap
  rsvp_deadline: 82,     // was 78 → 10% gap
};
```

**Summary**: Two "large" gaps at top (12% + 16%), then uniform 10% gaps for the bottom four zones — matching the screenshot exactly.

