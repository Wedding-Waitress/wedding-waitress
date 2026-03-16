

## Add Two Extra Lines Between Event Name & Event Date

**File**: `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` (lines 137-145)

**Change**: Increase the `event_date` Y position by 4 percentage points to add roughly 2 lines of vertical space between "Event Name" and "Event Date". Shift all subsequent zones down by the same amount to maintain their relative spacing.

**Current positions:**
- `event_date`: 38%
- `ceremony_info`: 48% (10% gap)
- `reception_info`: 58%
- `dress_code`: 68%
- `rsvp_deadline`: 78%

**New positions:**
- `event_date`: 42% (+4)
- `ceremony_info`: 52% (+4)
- `reception_info`: 62% (+4)
- `dress_code`: 72% (+4)
- `rsvp_deadline`: 82% (+4)

```ts
const PRESET_Y_POSITIONS: Record<string, number> = {
  you_are_invited: 14,
  event_name: 26,
  event_date: 42,       // +4 for 2 extra lines
  ceremony_info: 52,    // +4 to maintain spacing
  reception_info: 62,   // +4 to maintain spacing
  dress_code: 72,       // +4 to maintain spacing
  rsvp_deadline: 82,    // +4 to maintain spacing
};
```

