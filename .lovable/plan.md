
# Remove "View Analytics" Button from Dashboard

A simple cleanup: remove the purple "View Analytics" button from the empty Dashboard tab while keeping the icon, title, and description text.

## What Changes

The Dashboard tab currently shows:
- A trending-up icon
- "Dashboard Overview" title
- Welcome description text
- **"View Analytics" button (to be removed)**

After this change, only the icon, title, and description will remain -- a clean placeholder until you decide to build it out later.

## Technical Detail

**File:** `src/pages/Dashboard.tsx`

- **Lines 393-396**: Delete the `<Button>` element containing the Plus icon and "View Analytics" text. No other changes needed.
