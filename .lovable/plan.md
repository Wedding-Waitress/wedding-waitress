

# Fix Additional Guests Display & Center Action Buttons

## Problem
1. The "Additional Guests" row only renders when count > 0 -- it should always be visible
2. The Accept/Decline/Add Guest buttons are nested inside the RSVP section (which has an icon offset on the left), so they appear left-shifted rather than truly centered in the card

## Changes (single file: `src/components/GuestLookup/EnhancedGuestCard.tsx`)

### 1. Always show "Additional Guests" row
Remove the conditional `{(additionalGuestCount ?? 0) > 0 && (...)}` wrapper. The row will always render between Dietary Requirements and RSVP Status, showing either "{count} added" or "None added".

### 2. Move buttons outside the RSVP section
Currently the three buttons are inside the RSVP `<div>` that has the ClipboardCheck icon taking up left space. Move them out to be a standalone `<div className="flex gap-2 justify-center pt-1">` directly inside the card's main flex column. This makes them truly centered within the full card width.

### Before (structure)
```text
[ClipboardCheck icon] [RSVP Status + Badge]
                      [Accept] [Decline] [Add Guest]  <-- offset by icon
```

### After (structure)
```text
[UserPlus icon] [Additional Guests: X added]
[ClipboardCheck icon] [RSVP Status: Accept]
        [Accept] [Decline] [Add Guest]   <-- centered in full card
```

### Specific code changes (lines 236-310)

Replace the Additional Guests conditional block and the RSVP section with:

- **Additional Guests** (always visible, no conditional):
  - Same styling as other stat rows
  - Shows "None added" when count is 0, "{count} added" otherwise

- **RSVP Section**: Keep the icon + status badge row, but remove the buttons from inside it

- **Action Buttons**: New standalone div after RSVP section with `flex gap-2 justify-center pt-1` -- contains Accept, Decline, and Add Guest buttons (same styling, just relocated)

