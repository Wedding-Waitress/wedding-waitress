

## Configure Twilio SMS Secrets in Supabase

### What will be done
Add three Twilio secrets to your Supabase project so the existing `send-rsvp-sms` edge function can send SMS invites to your wedding guests.

### Secrets to configure
1. **TWILIO_ACCOUNT_SID** - Your Twilio account identifier
2. **TWILIO_AUTH_TOKEN** - Your Twilio authentication token (stored encrypted)
3. **TWILIO_PHONE_NUMBER** - Your Australian Twilio number (+61482072139)

### What this enables
- The `send-rsvp-sms` edge function will be able to send outbound SMS RSVP invitations to guests
- No code changes are needed -- the edge function already reads these secrets from environment variables

### Technical details
- Secrets are stored encrypted in Supabase and only accessible by edge functions at runtime
- They are never exposed in your frontend code or visible to users
- The existing edge function (`send-rsvp-sms`) already references `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`

