
# Fix RSVP Color Coding in Table View

## Problem
The Table View in the Guest Live View uses incorrect RSVP value checks. It compares against `'Confirmed'` and `'Declined'`, but the actual values are `'Attending'` and `'Not Attending'`. This causes all guests to display with the orange/pending color regardless of their actual RSVP status.

## Changes

### File: `src/components/GuestLookup/TableVisualization.tsx`

**1. Import `normalizeRsvp`** (line 6)
Add: `import { normalizeRsvp } from '@/lib/rsvp';`

**2. Fix seat circle colors** (lines 174-181)
Replace the hardcoded string checks (`'Confirmed'`, `'Declined'`) with `normalizeRsvp()` calls. Use green for Attending, red for Not Attending, orange for Pending:

- Attending: `bg-green-500/10 border-green-500 text-green-700`
- Not Attending: `bg-red-500/10 border-red-500 text-red-700`
- Pending: `bg-warning/10 border-warning text-warning-foreground` (unchanged orange)

**3. Fix guest list dot colors** (lines 215-218)
Replace `'Confirmed'`/`'Declined'` checks with `normalizeRsvp()`:
- Attending: `bg-green-500`
- Not Attending: `bg-red-500`
- Pending: `bg-warning`

**4. Fix RSVP text colors** (lines 237-241)
Replace string checks with `normalizeRsvp()` and display the normalized status:
- Attending: `text-green-500` showing "Attending"
- Not Attending: `text-red-500` showing "Not Attending"
- Pending: `text-warning` showing "Pending"
