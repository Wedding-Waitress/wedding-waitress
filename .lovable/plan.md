

## Send RSVP Invites Feature -- Full Implementation Plan

This is a comprehensive feature that lets users send RSVP invitations to their guest list via **email** (Resend) and/or **SMS** (Twilio), with a checkbox-based selection system already familiar from the existing bulk actions.

---

### What You (Platform Owner) Need to Do Once

**For Email (Resend):**
- You already have `RESEND_API_KEY` configured as a Supabase secret -- this is your platform-level key
- You will need a verified sending domain in Resend (e.g., `noreply@weddingwaitress.com`) so emails come from your brand
- Cost: Free tier = 100 emails/day, 3,000/month. Paid = $20/month for 50,000 emails

**For SMS (Twilio):**
- You need to purchase a Twilio phone number (~$1.15/month AUD) and add these secrets to Supabase:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`  
  - `TWILIO_PHONE_NUMBER`
- Cost: ~$0.05-0.12 AUD per SMS depending on country

**No user ever needs API keys** -- your platform keys handle everything.

---

### Database Changes

**1. Add `rsvp_invite_status` column to `guests` table**
- New column: `rsvp_invite_status` (text, default `'not_sent'`)
- Values: `not_sent`, `email_sent`, `sms_sent`, `both_sent`
- This replaces the purpose of the existing `rsvp_date` field in the Add Guest modal

**2. Add `rsvp_invite_sent_at` column to `guests` table**
- New column: `rsvp_invite_sent_at` (timestamptz, nullable)
- Records when the invite was last sent

**3. Create `rsvp_invite_logs` table** for tracking delivery history:
- `id` (uuid, pk)
- `event_id` (uuid, fk events)
- `guest_id` (uuid, fk guests)  
- `user_id` (uuid)
- `channel` (text: 'email' or 'sms')
- `status` (text: 'sent', 'failed', 'delivered', 'bounced')
- `error_message` (text, nullable)
- `sent_at` (timestamptz)

---

### Guest List Table Column Reorder

The current column order is:
Checkbox | First Name | Last Name | Table No | Seat No | RSVP Status | Relation | Dietary | Mobile | Email | Family/Group | Notes | Actions

**New proposed column order** (you mentioned wanting to change the order -- please confirm this is what you want):
Checkbox | First Name | Last Name | Mobile | Email | RSVP Invite | RSVP Status | Table No | Seat No | Relation | Dietary | Family/Group | Notes | Actions

**Key changes:**
- Mobile and Email move closer to the name (important for sending invites)
- New **RSVP Invite** column added (shows "Not Sent" / "Sent" badge)
- RSVP Status stays (tracks the guest's actual response)

---

### Add Guest Modal Changes

- **Remove** the "RSVP Date" field (the deadline is already set at event level)
- **Add** an "RSVP Invite" display field showing the current status:
  - "Not Sent" (grey badge) -- default for new guests
  - "Email Sent" (blue badge) -- after email invite sent
  - "SMS Sent" (green badge) -- after SMS invite sent
  - "Both Sent" (purple badge) -- after both channels used

---

### Send RSVP Invites UI

**Two new buttons** in the guest list toolbar (next to Import/Export):
- **Send Email Invites** (envelope icon, blue) 
- **Send SMS Invites** (phone icon, green)

**How it works:**
1. User checks the boxes next to guests they want to invite (same checkbox system already used for bulk actions)
2. Guests without an email address will be greyed out / unselectable for email; same for guests without a mobile number for SMS
3. User clicks "Send Email Invites" or "Send SMS Invites"
4. A confirmation modal appears:
   - Shows count: "Send email invite to 45 guests?"
   - Shows which guests are missing contact info and will be skipped
   - Shows cost estimate (if using paid credits system)
   - "Send" (green) and "Cancel" (red) buttons
5. On Send, an Edge Function processes the batch:
   - Sends personalised email/SMS to each guest with their unique QR code link
   - Updates `rsvp_invite_status` on each guest record
   - Logs each send in `rsvp_invite_logs`
   - Returns success/failure summary

**"Select All" convenience:**
- The existing "Select All" checkbox in the header already works
- Users uncheck anyone they do not want to send to
- A smart filter could be added: "Select all guests who haven't been sent an invite yet"

---

### Edge Functions

**1. `send-rsvp-email` Edge Function**
- Accepts: `event_id`, `guest_ids[]`
- Uses platform-level `RESEND_API_KEY` secret
- Sends personalised HTML email to each guest containing:
  - Event name, date, venue
  - Couple names
  - Personalised greeting: "Dear [First Name]"
  - QR code link to `/s/[event-slug]` for the guest to RSVP
  - RSVP deadline (from event settings)
- Updates guest records with `rsvp_invite_status` and `rsvp_invite_sent_at`
- Checks `communication_credits` before sending (for paid plans)
- Deducts credits after successful send

**2. `send-rsvp-sms` Edge Function**
- Accepts: `event_id`, `guest_ids[]`
- Uses platform-level `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` secrets
- Sends personalised SMS to each guest:
  - "Hi [Name]! You're invited to [Event Name] on [Date]. RSVP here: [short link]"
- Same credit/logging system as email

---

### Pricing / Credit Integration

The existing `subscription_plans` table already has `can_send_email` and `can_send_sms` flags:
- **Starter plan**: Email and SMS disabled (upgrade required)
- **Essential, Premium, Unlimited, Vendor Pro**: Email and SMS enabled

The existing `communication_credits` and `check_communication_credits()` function will handle per-message billing. When a Starter user tries to send, they see an upgrade modal.

---

### Summary of Files to Create/Modify

**New files:**
- `supabase/functions/send-rsvp-email/index.ts` -- Email sending Edge Function
- `supabase/functions/send-rsvp-sms/index.ts` -- SMS sending Edge Function
- `src/components/Dashboard/SendRsvpConfirmModal.tsx` -- Confirmation modal before sending
- `src/hooks/useRsvpInvites.ts` -- Hook for managing invite state and sending

**Modified files:**
- `src/components/Dashboard/GuestListTable.tsx` -- Add RSVP Invite column, reorder columns, add Send buttons
- `src/components/Dashboard/AddGuestModal.tsx` -- Replace RSVP Date with RSVP Invite status display
- `src/components/Dashboard/GuestBulkActionsBar.tsx` -- Add "Send Email" and "Send SMS" bulk actions
- Database migration for new columns and table

**Secrets needed (one-time setup by you):**
- `TWILIO_ACCOUNT_SID` -- needs to be added
- `TWILIO_AUTH_TOKEN` -- needs to be added
- `TWILIO_PHONE_NUMBER` -- needs to be added
- `RESEND_API_KEY` -- already configured

---

### Implementation Phases

**Phase 1 (recommended to start):** Email invites only
- Database changes (new columns + table)
- Guest list column reorder + RSVP Invite column
- Remove RSVP Date from Add Guest modal
- Send Email Edge Function
- Send confirmation modal
- Credit checking

**Phase 2:** SMS invites
- Add Twilio secrets
- Send SMS Edge Function
- SMS button in toolbar

This phased approach lets you launch email invites quickly while SMS setup happens in parallel.

