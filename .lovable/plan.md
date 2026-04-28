## Goal
Set the sender (`from`) and `reply_to` on every outbound email to `support@weddingwaitress.com.au`, using the already-verified `weddingwaitress.com.au` domain. No design, layout, or functional changes.

## Findings — all sender locations

After scanning `supabase/functions/` and `src/`, these are the only places that actually send email and currently use a non-final sender:

| # | File | Current sender | Action |
|---|------|---------------|--------|
| 1 | `supabase/functions/send-transactional-email/index.ts` (lines 12, 16, 316) | `Wedding Waitress <noreply@weddingwaitress.com.au>` (built from `FROM_DOMAIN` + `noreply@`) | Change `from` to `Wedding Waitress <support@weddingwaitress.com.au>`, add `reply_to: "support@weddingwaitress.com.au"`. Keep `SENDER_DOMAIN = "notify.weddingwaitress.com.au"` (verified subdomain — required by API). |
| 2 | `supabase/functions/send-rsvp-email/index.ts` (line 123) | `Wedding Waitress <noreply@weddingwaitress.com>` (still old `.com`) | Change to `Wedding Waitress <support@weddingwaitress.com.au>`, add `reply_to`. |
| 3 | `supabase/functions/send-invitation-email/index.ts` (line 127) | `Wedding Waitress <noreply@weddingwaitress.com>` (still old `.com`) | Change to `Wedding Waitress <support@weddingwaitress.com.au>`, add `reply_to`. |
| 4 | `supabase/functions/send-auth-email/index.ts` (line 174) | `Wedding Waitress <onboarding@resend.dev>` (Resend test sender) | Change to `Wedding Waitress <support@weddingwaitress.com.au>`, add `reply_to`. |

## Not changing (intentional)

- `SENDER_DOMAIN = "notify.weddingwaitress.com.au"` in `send-transactional-email/index.ts` — this is the verified sending subdomain required by the Lovable email API. The visible `From:` header still becomes `support@weddingwaitress.com.au`.
- `to:` fields in transactional template registries (`contact-form-message.tsx`, `admin-new-signup.tsx`, `admin-new-payment.tsx`) — these are recipient addresses (already `support@weddingwaitress.com.au`), not senders.
- `supabase/functions/admin-send-otp/index.ts` line 93 (`From: twilioPhone`) — Twilio SMS sender, not email.
- `supabase/functions/send-rsvp-sms/index.ts` — SMS only, no email sender.
- Body footers / mailto links / legal pages already on `support@weddingwaitress.com.au`.
- `AdminNotificationSettings.tsx` placeholder text — UI placeholder only, not an actual sender.

## Technical changes (per file)

**`supabase/functions/send-transactional-email/index.ts`**
- Line 316: `from: \`${SITE_NAME} <support@${FROM_DOMAIN}>\`` (was `noreply@`)
- Add `reply_to: "support@weddingwaitress.com.au"` to the send payload

**`supabase/functions/send-rsvp-email/index.ts`**
- Line 123: `from: 'Wedding Waitress <support@weddingwaitress.com.au>'`
- Add `reply_to: 'support@weddingwaitress.com.au'` to the JSON body

**`supabase/functions/send-invitation-email/index.ts`**
- Line 127: `from: 'Wedding Waitress <support@weddingwaitress.com.au>'`
- Add `reply_to: 'support@weddingwaitress.com.au'` to the JSON body

**`supabase/functions/send-auth-email/index.ts`**
- Line 174: `from: "Wedding Waitress <support@weddingwaitress.com.au>"`
- Add `reply_to: "support@weddingwaitress.com.au"` to the Resend send call

## Deploy
Edge functions auto-deploy after edits. No DNS, no schema, no UI changes.

## Deliverable
After implementation, I will list every file + line that was changed.
