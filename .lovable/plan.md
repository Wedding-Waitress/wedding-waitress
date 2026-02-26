

# Change RSVP Display Labels: "Accept" to "Attending", "Decline" to "Not Attending"

## Summary
Update the centralized `getRsvpDisplayLabel` function so the RSVP status badges across the entire app display "Attending" and "Not Attending" instead of "Accept" and "Decline".

## Change (single file: `src/lib/rsvp.ts`)

In the `getRsvpDisplayLabel` function (lines 33-43):
- Change the return value for `"Attending"` from `"Accept"` to `"Attending"`
- Change the return value for `"Not Attending"` from `"Decline"` to `"Not Attending"`

This single change will update the labels consistently across:
- The Guest List table
- Guest mobile cards
- Kiosk guest cards
- The Guest Lookup / Live View cards

No other files need modification.

