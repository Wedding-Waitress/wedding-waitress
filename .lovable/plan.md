

## Adjust Preset Zone Vertical Spacing

**File**: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` (lines 137-145)

**Current gaps:**
- you_are_invited (14) → event_name (26) = 12
- event_name (26) → event_date (38) = 12
- event_date (38) → ceremony_info (48) = 10
- ceremony_info (48) → reception_info (60) = **12**
- reception_info (60) → dress_code (70) = **10**
- dress_code (70) → rsvp_deadline (80) = **10**

**User wants:**
1. Equal spacing for the bottom four zones (RSVP ↔ Dress ↔ Reception ↔ Ceremony) — standardize to 10
2. Same equal spacing (10) between Ceremony and Event Date — already 10, no change
3. Larger spacing (12) between Event Date and Event Name — already 12, no change

**Only actual change:** `reception_info` from 60 → 58 (making ceremony→reception = 10 instead of 12), then shift dress_code and rsvp_deadline down accordingly.

```ts
const PRESET_Y_POSITIONS: Record<string, number> = {
  you_are_invited: 14,  // unchanged
  event_name: 26,       // unchanged (12 gap — "larger")
  event_date: 38,       // unchanged (12 gap — "larger")
  ceremony_info: 48,    // unchanged (10 gap)
  reception_info: 58,   // was 60 → 10 gap from ceremony
  dress_code: 68,       // was 70 → 10 gap
  rsvp_deadline: 78,    // was 80 → 10 gap
};
```

