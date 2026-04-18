
## Goal
Fix the auth OTP email so it matches screenshot #1's layout: visible Wedding Waitress brown logo at top, then heading, greeting, instruction, brown OTP code, "expires in 10 minutes" line, plain "Or click the button below to sign in directly:" text (no highlight), then magic-link button. Then test by triggering a real sign-in and verifying the rendered email.

## Findings
Current email (`supabase/functions/send-auth-email/index.ts`) already has the correct structure (logo → heading → greeting → instruction → OTP → expiry line → divider → "Or click..." text → button). Two real issues from screenshot #2:

1. **Logo broken** — the `<img src="https://weddingwaitress.com/wedding-waitress-logo-brown.png">` is not loading in Outlook (shows placeholder box "Wedding Waitress"). Cause: the file at that public URL is either missing, blocked, or not the brown logo. The previously-created `public/wedding-waitress-logo-brown.png` may not have published yet, or Outlook is blocking the host. Fix: upload the brown logo to Supabase Storage (publicly hosted, CDN-backed, never blocked) and use that URL — same pattern Resend recommends.

2. **"Sign In with Magic Link" appears highlighted** — in screenshot #2 it renders as a yellow-highlighted text link, not as a brown button. Likely because the Outlook client is mangling the inline `<a>` styles. Looking again: the user wants the line *above* the button ("Or click the button below to sign in directly:") to be plain dark-gray text with no highlight/background. The current code already has it as plain text — but in screenshot #2, what looks highlighted is actually the **button itself** rendering oddly. The user's instruction is clear: keep the layout from screenshot #1 (which has the proper brown button). So the button must render as a solid brown button, and the lead-in line stays plain.

The countdown ("This code expires in 10 minutes") in email cannot literally tick down — email HTML is static. Screenshot #1 shows static text "This code expires in **10 minutes**" — that's what we keep. (A live countdown is not possible in email.)

## Plan

1. **Upload brown logo to Supabase Storage** (bucket: `email-assets`, public read) — file: `wedding-waitress-logo-brown.png` from `user-uploads://Wedding_Waitress._Brown._PNG-5.png`. Get the public URL.

2. **Update `supabase/functions/send-auth-email/index.ts`** (override its lock for this approved fix):
   - Replace the logo `<img src>` with the new Supabase Storage public URL.
   - Keep the existing heading / greeting / instruction / brown OTP / "expires in 10 minutes" structure as-is (matches screenshot #1).
   - Keep "Or click the button below to sign in directly:" as plain `color: #71717a` text (no background, no highlight) — already correct, just verify.
   - Keep the magic-link `<a>` rendered as a solid `#967A59` brown button with white text and `display: inline-block` + padding (already correct, just verify it renders properly).
   - Re-apply the production-lock comment header.

3. **Deploy** the `send-auth-email` Edge Function.

4. **Test end-to-end**: trigger a real sign-in OTP request to the user's email via the auth flow (or directly via curl to the function's hook endpoint with a sample payload), then check function logs to confirm successful Resend delivery (200 + message ID). Confirm zero errors.

5. **Re-lock**: confirm the lock comment is in place at the top of the file. The lock entry in `LOCKED_TRANSLATION_KEYS.md` from the previous turn already covers this file — no change needed there.

## Files to modify
- `supabase/functions/send-auth-email/index.ts` (logo URL swap + verify button/text styles)
- New asset uploaded to Supabase Storage `email-assets/wedding-waitress-logo-brown.png`

## Out of scope
- Sender avatar circle (purple "WW") — controlled by Outlook/BIMI, not our code (explained previously).
- Live countdown timer — not possible in static email HTML.
- Any other email template, color, or copy.

## Verification (will run before reporting done)
1. Confirm the Supabase Storage public URL returns the brown logo (HTTP 200, image content-type).
2. Re-read the deployed function code → confirm new logo URL, brown button, plain lead-in text.
3. Invoke the Edge Function with a test webhook payload → confirm 200 response and Resend message ID in logs.
4. Report the changes confirmed deployed and tested.
