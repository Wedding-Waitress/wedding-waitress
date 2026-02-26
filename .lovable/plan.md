

# Email & SMS Sending for Designed Invitations

## What We're Building
Add a "Send Invitation" feature to the Invitations customizer that lets couples send their beautifully designed invitation image directly to guests via email (with the invitation embedded inline) or SMS (with an RSVP link). This leverages the existing `send-rsvp-email` and `send-rsvp-sms` Edge Functions but enhances the email to include the designed invitation as an inline image.

## How It Works for You
1. After customising your invitation, a new "Send to Guests" button appears in the Export & Share panel
2. Opens a modal showing your guest list with checkboxes to select recipients
3. Choose Email or SMS as the delivery channel
4. Email sends your designed invitation image embedded in a branded email template with an RSVP button
5. SMS sends a text message with the RSVP link (image can't be embedded in SMS)
6. Delivery status is tracked per guest (sent/failed/skipped)
7. Free plan: limited to 3 sends; paid plans: unlimited

## Technical Plan

### 1. New Component: `InvitationSendModal.tsx`
**New file:** `src/components/Dashboard/Invitations/InvitationSendModal.tsx`

- Modal with guest list (fetched via existing `useGuests` hook)
- Select all / individual checkboxes
- Filter: show only guests with email (for email) or mobile (for SMS)
- Channel toggle: Email / SMS
- Shows delivery status badges per guest (from `rsvp_invite_status`)
- "Send" button with confirmation count
- Progress indicator during sending
- Uses existing `useRsvpInvites` hook for SMS sends
- For email sends with invitation image, calls a new Edge Function

### 2. New Edge Function: `send-invitation-email`
**New file:** `supabase/functions/send-invitation-email/index.ts`

- Accepts: `event_id`, `guest_ids`, `invitation_image_base64`
- Sends via Resend API (same as existing `send-rsvp-email`)
- Email HTML template includes:
  - The designed invitation as an inline base64 image (embedded, not attached)
  - An RSVP button linking to `/s/{event-slug}`
  - Wedding Waitress branding footer
- Updates `guests.rsvp_invite_status` and logs to `rsvp_invite_logs` (same as existing)
- Auth: validates JWT, verifies event ownership (same pattern as existing Edge Functions)

### 3. New Hook: `useInvitationSend.ts`
**New file:** `src/hooks/useInvitationSend.ts`

- `sendInvitationEmail(eventId, guestIds, imageBase64)` -- calls the new Edge Function
- `sendInvitationSms(eventId, guestIds)` -- delegates to existing `send-rsvp-sms` Edge Function
- Returns `{ sending, sendInvitationEmail, sendInvitationSms }`

### 4. Generate Invitation Image for Sending
- Before sending, use the existing `buildInvitationElement` + `captureElement` from `invitationExporter.ts` to render the invitation as a PNG
- Convert canvas to base64 and pass to the Edge Function
- Export these two functions from `invitationExporter.ts` so the send modal can use them
- For personalised sends (templates with guest_name zone): render per-guest with their name

### 5. Update `InvitationExporter.tsx`
- Add a "Send to Guests" button below the existing export buttons (with a Mail/Send icon)
- Opens the `InvitationSendModal`
- Pass through all template/customisation data needed to render the invitation image

### 6. Plan Gating
- Free (Starter) plan: limited to 3 sends total (same pattern as export limit)
- Paid plans: unlimited sends
- Uses existing `useUserPlan` hook

### Files Changed

| File | Change |
|------|--------|
| `src/components/Dashboard/Invitations/InvitationSendModal.tsx` | New -- guest selection + send modal |
| `src/hooks/useInvitationSend.ts` | New -- hook for sending invitation emails/SMS |
| `supabase/functions/send-invitation-email/index.ts` | New -- Edge Function to send invitation image via Resend |
| `src/lib/invitationExporter.ts` | Export `buildInvitationElement` and `captureElement` for reuse |
| `src/components/Dashboard/Invitations/InvitationExporter.tsx` | Add "Send to Guests" button + modal integration |

### Email Template Design
The invitation email will follow the existing Wedding Waitress email style:
- Purple gradient header: "You're Invited!"
- Guest's name greeting
- The designed invitation image (full width, inline)
- RSVP button (purple gradient pill)
- Wedding Waitress footer branding
- "Do not reply" notice

### Edge Function Pattern
Follows the exact same authentication and logging pattern as the existing `send-rsvp-email`:
- JWT verification via `supabase.auth.getClaims()`
- Event ownership check
- Per-guest send loop with error handling
- Status updates to `guests.rsvp_invite_status`
- Logging to `rsvp_invite_logs` table

