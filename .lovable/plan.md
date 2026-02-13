

## Send RSVP Invites -- Full Implementation Plan (Email + SMS)

This plan implements the complete RSVP invite sending feature with both Email (Resend) and SMS (Twilio), including the guest list column reorder, invite status tracking, and tiered pricing.

---

### Phase 1: Database Changes (Manual SQL)

You will need to run this SQL in the Supabase SQL Editor before the code changes will work:

**Changes to `guests` table:**
- Add `rsvp_invite_status` column (text, default `'not_sent'`) -- tracks whether email/SMS/both have been sent
- Add `rsvp_invite_sent_at` column (timestamptz, nullable) -- timestamp of last send

**New `rsvp_invite_logs` table:**
- Tracks every individual send attempt with: event_id, guest_id, user_id, channel (email/sms), status (sent/failed/delivered/bounced), error_message, sent_at
- RLS policies: users can view/insert their own logs
- Indexes on event_id, guest_id for fast lookups

---

### Phase 2: Guest List Table Column Reorder

**File: `src/components/Dashboard/GuestListTable.tsx`**

Current column order:
Checkbox | First Name | Last Name | Table No | Seat No | RSVP Status | Relation | Dietary | Mobile | Email | Family/Group | Notes | Actions

New column order:
Checkbox | First Name | Last Name | Mobile | Email | **RSVP Invite** | RSVP Status | Table No | Seat No | Relation | Dietary | Family/Group | Notes | Actions

Changes:
- Reorder the `<TableHead>` elements in the header row
- Reorder the `<TableCell>` elements in each guest row
- Add new "RSVP Invite" column showing status badges:
  - "Not Sent" (grey badge)
  - "Email Sent" (blue badge)
  - "SMS Sent" (green badge)
  - "Both Sent" (purple badge)
- Update the `colSpan` values for empty/loading states (now 14 columns instead of 13)

---

### Phase 3: Send Buttons + Bulk Actions Bar

**File: `src/components/Dashboard/GuestListTable.tsx`**

Add two new buttons in the toolbar area (next to Import/Export):
- "Send Email Invites" (Mail icon, blue) -- only enabled when guests are selected
- "Send SMS Invites" (Phone icon, green) -- only enabled when guests are selected

**File: `src/components/Dashboard/GuestBulkActionsBar.tsx`**

Add "Send Email" and "Send SMS" action buttons to the floating purple bulk actions bar that appears when guests are checked.

---

### Phase 4: Confirmation Modal

**New file: `src/components/Dashboard/SendRsvpConfirmModal.tsx`**

A modal that appears when the user clicks "Send Email Invites" or "Send SMS Invites":
- Shows count: "Send email invite to 45 guests?"
- Lists guests that will be skipped (missing email or mobile)
- Shows pricing tier based on total guest count:
  - 1-300 guests: $50
  - 301-500 guests: $100
  - 501-1000 guests: $150
  - Bundle (Email + SMS): $80 / $150 / $200
- "Send" (green) and "Cancel" buttons
- Loading state while sending

---

### Phase 5: RSVP Invites Hook

**New file: `src/hooks/useRsvpInvites.ts`**

Custom hook that:
- Calls the Edge Functions to send emails/SMS
- Handles loading and error states
- Refreshes guest data after sending to update invite status badges
- Checks subscription plan permissions before allowing sends

---

### Phase 6: Edge Functions

**New file: `supabase/functions/send-rsvp-email/index.ts`**

- Accepts: `event_id`, `guest_ids[]`
- Validates user owns the event (manual JWT verification)
- Uses platform-level `RESEND_API_KEY` secret
- Fetches event details (name, date, venue, slug, partner names, rsvp_deadline)
- For each guest with a valid email:
  - Sends personalised HTML email with:
    - "Please do not reply to this email"
    - "Dear [First Name], [Partner1] & [Partner2] invite you to their [Event Name] on [Date] at [Venue]"
    - RSVP deadline if set
    - Large "RSVP Now" button linking to `/s/[event-slug]`
    - Wedding Waitress branding in footer
  - Updates `rsvp_invite_status` and `rsvp_invite_sent_at` on guest record
  - Logs the send in `rsvp_invite_logs`
- Returns summary: { sent: number, failed: number, skipped: number }

**New file: `supabase/functions/send-rsvp-sms/index.ts`**

- Same structure as email function
- Uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` secrets
- Sends: "Do not reply. [Partner1] & [Partner2] invite you to [Event Name] on [Date]. RSVP here: [link]"
- Same logging and status update pattern

Both functions set `verify_jwt = false` in config.toml and perform manual authorization checks (consistent with existing edge function patterns like `generate-seating-suggestions`).

---

### Phase 7: Add Guest Modal Update

**File: `src/components/Dashboard/AddGuestModal.tsx`**

- Remove the "RSVP Date" field (the deadline is set at event level, not per guest)
- When editing an existing guest, display a read-only "RSVP Invite" badge showing the current invite status (Not Sent / Email Sent / SMS Sent / Both Sent)

---

### Phase 8: Guest Interface Update

**File: `src/hooks/useGuests.ts`**

- Add `rsvp_invite_status` and `rsvp_invite_sent_at` to the `Guest` interface so TypeScript recognises the new columns

---

### Pricing Model (Stored for Future Payment Integration)

The tiered pricing will be enforced when you integrate Stripe payments:

| Channel | 1-300 Guests | 301-500 Guests | 501-1000 Guests |
|---------|-------------|----------------|-----------------|
| SMS only | $50 | $100 | $150 |
| Email only | $50 | $100 | $150 |
| SMS + Email bundle | $80 | $150 | $200 |

For now, the confirmation modal will display these prices and the system will check the user's subscription plan. Payment gating will be added when Stripe is integrated.

---

### Secrets Required

Already configured:
- `RESEND_API_KEY` -- ready to use

Need to be added (when you purchase a Twilio number):
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

---

### Files Summary

**New files (4):**
- `supabase/functions/send-rsvp-email/index.ts`
- `supabase/functions/send-rsvp-sms/index.ts`
- `src/components/Dashboard/SendRsvpConfirmModal.tsx`
- `src/hooks/useRsvpInvites.ts`

**Modified files (4):**
- `src/components/Dashboard/GuestListTable.tsx` -- column reorder, RSVP Invite column, Send buttons
- `src/components/Dashboard/AddGuestModal.tsx` -- remove RSVP Date, add invite status badge
- `src/components/Dashboard/GuestBulkActionsBar.tsx` -- add Send Email/SMS actions
- `src/hooks/useGuests.ts` -- add new fields to Guest interface
- `supabase/config.toml` -- add new edge function configs

