

## Adjust Preset Zone Vertical Spacing

**File**: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` (line 137-145)

**Current spacing analysis:**
- You Are Invited (14) → Event Name (26) = **12% gap** ✓
- Event Name (26) → Event Date (38) = **12% gap** ✓ (already matches)
- Ceremony Info (48) → Reception Info (58) = 10% gap (needs to become 12%)

**Changes:**
1. Event Name → Event Date spacing is already 12%, no change needed
2. Increase Ceremony Info → Reception Info gap from 10% to 12%

```ts
const PRESET_Y_POSITIONS: Record<string, number> = {
  you_are_invited: 14,  // unchanged
  event_name: 26,       // unchanged
  event_date: 38,       // unchanged (gap is already 12)
  ceremony_info: 48,      // unchanged
  reception_info: 60,     // was 58 → +2 for 12% gap from ceremony
  dress_code: 70,         // was 68 → +2 to maintain relative spacing
  rsvp_deadline: 80,      // was 78 → +2 to maintain relative spacing
};
```

