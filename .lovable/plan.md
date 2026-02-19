
# Add Manual RSVP Invite Status Control in Edit Guest

## What This Does
Replaces the read-only "RSVP Invite Status" badge in the Edit Guest form with a dropdown selector, so you can manually change it (e.g., mark as "Sent" when you've texted a guest from your personal phone).

## Changes

### 1. Replace the static badge with a Select dropdown
In the Edit Guest form, the current grey/blue/green/purple badge next to "RSVP Invite Status" becomes a dropdown with these options:
- **Not Sent** (grey)
- **Email Sent** (blue)
- **SMS Sent** (green)
- **Both Sent** (purple)

This lets you manually set any status regardless of whether the platform sent the invite.

### 2. Save the manual status on "Update Guest"
When you click "Update Guest", the selected invite status is included in the database update alongside all other guest fields.

## Technical Details

**File: `src/components/Dashboard/AddGuestModal.tsx`**

1. **Lines 1120-1139** -- Replace the static badge with a `Select` dropdown that reads/writes a local state variable `manualInviteStatus`, initialized from `editGuest.rsvp_invite_status`.

2. **Lines 584-590 (guestData object)** -- When editing, include `rsvp_invite_status: manualInviteStatus` in the update payload so the manual change is persisted to the database.

3. **Add state** -- A new `useState` for `manualInviteStatus`, initialized when `editGuest` changes (around the existing reset effects).
