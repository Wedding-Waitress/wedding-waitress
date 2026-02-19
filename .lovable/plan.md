

# Auto-Switch Guest Lookup Header Text on Event Day

On the day of the wedding, the search card header will automatically change so guests are not confused by "Update & Confirm Your Details" messaging. No manual toggle needed -- it syncs with the event date.

## What Changes

**Before event day (as it is now):**
- Line 1: "Type Your Full Name Here"
- Line 2: "Update & Confirm Your Details"

**On the event day (automatic):**
- Line 1: "Type Your Full Name"
- Line 2: "To Find Your Table & Seat"

Same black color, same font, same size -- only the wording changes.

## How It Works

The page already has the event date available (`event.date`). A simple date comparison checks if today matches the event date. If it does, the "day-of" wording is shown instead. This happens automatically with no host action required.

The event timezone field (`event.event_timezone`) will be used if available, so the switchover happens at the correct local time for the venue.

## Technical Detail

**File:** `src/pages/GuestLookup.tsx`

- Add a computed boolean (`isEventDay`) that compares today's date against `event.date`, respecting the event timezone if set.
- At **lines 602-607**, update the two `CardTitle` elements to use conditional text based on `isEventDay`:
  - If `isEventDay` is true: "Type Your Full Name" and "To Find Your Table & Seat"
  - If `isEventDay` is false: keep current text ("Type Your Full Name Here" / "Update & Confirm Your Details" or "Find Your Seat")

One small variable addition and two string conditionals -- no layout or styling changes.

