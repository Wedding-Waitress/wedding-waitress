
# Smart RSVP & Messaging — Final Implementation Plan

Move SMS from "users bring their own Twilio" to a fully managed Wedding Waitress messaging service, and rebrand the existing $99 RSVP unlock as **Smart RSVP & Messaging** with **250 SMS credits** included and $99 + GST top-up packs.

---

## 1. Database (single new migration)

### `sms_pricing_constants` (single-row config table for future flexibility)
- `id` (singleton), `included_credits` (default 250), `topup_credits` (default 250), `topup_price_aud` (default 99), `gst_rate` (default 0.10)
- Read-only to clients; admin-only writes via RLS.

### `sms_credits`
- `user_id`, `event_id`, `total`, `used`, `remaining` (generated `total - used`), `last_topup_at`, timestamps
- Unique on (`user_id`, `event_id`)
- RLS: owner-select only; all writes via SECURITY DEFINER RPCs.

### `sms_send_logs` (audit)
- `user_id`, `event_id`, `guest_id`, `to_masked` (last 4 digits), `twilio_sid`, `status` (`sent`/`failed`), `error_message`, `created_at`
- Owner-select only.

### RPCs (all SECURITY DEFINER, search_path=public)
- `get_sms_credits(_user_id, _event_id) → { total, used, remaining }`
- `add_sms_credits(_user_id, _event_id, _amount, _source) → void` — upsert + increment, set `last_topup_at`
- `consume_sms_credit(_user_id, _event_id, _guest_id, _twilio_sid) → boolean` — atomic `UPDATE … WHERE remaining > 0 RETURNING true`; only called **after** Twilio success
- `log_sms_send(_user_id, _event_id, _guest_id, _to_masked, _twilio_sid, _status, _error) → void`

### Backfill (in same migration)
- For every user with a completed `rsvp_invite_purchases` (`purchase_type='rsvp_tier'` or legacy NULL): insert one `sms_credits` row with `total=250, used=0` if missing.

---

## 2. Stripe & checkout

- Reuse the existing $99 RSVP tier price as the **Smart RSVP & Messaging activation price** (label change only — no new Stripe product).
- Create one new Stripe price: **SMS Top-up — 250 credits — $99 AUD** via the Stripe tool. Save id in `src/lib/stripePrices.ts` as `SMS_TOPUP`.
- New edge function `create-sms-topup-checkout`: takes `event_id`, creates a one-time Stripe Checkout session with `metadata: { type: 'sms_topup', user_id, event_id }`.
- `verify-payment`: add two branches
  - Smart RSVP activation completion → call `add_sms_credits(user_id, event_id, 250, 'activation')`
  - `metadata.type='sms_topup'` completion → call `add_sms_credits(user_id, event_id, 250, 'topup')` and insert a `rsvp_invite_purchases` row with `purchase_type='sms_topup'` for billing history.

---

## 3. Edge function: `send-rsvp-sms` (rewrite)

- Remove ALL reads from `notification_settings`.
- Use platform secrets only:
  - **Primary**: `TWILIO_MESSAGING_SERVICE_SID` → POST with `MessagingServiceSid`
  - **Fallback**: if not set, use `TWILIO_PHONE_NUMBER` as `From`
  - Auth always uses `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`
- For each guest in the batch:
  1. Pre-check: if `get_sms_credits().remaining <= 0` → stop loop, return `{ sent, failed, skipped, blocked: true, error: 'SMS credits exhausted' }`
  2. Call Twilio
  3. Only on Twilio success **AND** valid `sid` returned → `consume_sms_credit(...)`
  4. On any Twilio failure → do **not** consume; call `log_sms_send(status='failed', error)`; continue to next guest
- 1 successful Twilio send = exactly 1 credit deducted (per-message accounting confirmed).
- Returns `{ sent, failed, skipped, credits_remaining }`.

---

## 4. Reusable service layer

New file `supabase/functions/_shared/sms-service.ts` exporting:
- `getCredits(adminClient, userId, eventId)`
- `consumeCredit(adminClient, userId, eventId, guestId, twilioSid)`
- `logSend(adminClient, ...)`
- `sendTwilioSms({ to, body })` — handles MessagingService/Phone fallback in one place
- `sendBulkSms({ adminClient, userId, eventId, recipients })` — orchestrates the loop with the credit safety rule

`send-rsvp-sms` and any future SMS feature (reminders, guest messaging) all use this single helper.

---

## 5. Frontend

### Removed entirely (no UI, no DB writes)
- All Twilio fields in `AdminNotificationSettings.tsx`: Account SID, Auth Token, Messaging Service SID, From phone, SMS provider dropdown.
- The Twilio fields stay in the DB table for now (write `null` only) so existing rows aren't lost — backward-compatible. The hook stops writing them.
- `useNotificationSettings.ts`: removes SMS write surface; keeps email (Resend) intact.

### New
- `src/lib/smsPricing.ts` — central constants (mirrors `sms_pricing_constants` defaults; loaded on app start, with hard-coded fallback): `INCLUDED_CREDITS`, `TOPUP_CREDITS`, `TOPUP_PRICE_AUD`, `GST_RATE`, helpers like `formatPriceWithGst()`.
- `src/hooks/useSmsCredits.ts` — `{ total, used, remaining, loading, refetch }` with realtime subscription on `sms_credits`.
- `src/components/Dashboard/SmsCreditMeter.tsx` — shows `"X of Y SMS credits used · Z remaining"`, color tiers:
  - `≤ 50`: amber notice
  - `≤ 25`: red notice + inline "Top up" link
  - `0`: hard-locked banner + primary "Purchase 250 more SMS credits ($99 + GST)" CTA → `create-sms-topup-checkout`
- New modal `SmsTopupModal.tsx` — Stripe checkout launcher (mirrors `RsvpActivationModal` pattern).

### Updated
- `RsvpActivationModal.tsx` — relabel to **"Smart RSVP & Messaging"**; bullets become:
  - SMS invitations
  - RSVP reminders
  - Email invitations
  - Guest messaging
  - RSVP tracking
  - **250 SMS message credits included**
- `GuestListTable.tsx` SMS send drawer — embeds `SmsCreditMeter`; SMS send buttons are **disabled** when `remaining === 0` and replaced with a "Purchase 250 more SMS credits" CTA. (No layout changes — the desktop table is locked; only the side panel/drawer is touched.)
- `Account/BillingCard.tsx` + `HistoryCard.tsx` — show Smart RSVP & Messaging activation + each top-up as separate line items; show current credit balance.
- All user-facing wording swap (search/replace audit): "RSVP Invitations", "RSVP Upgrade", "SMS setup", "Connect Twilio" → **"Smart RSVP & Messaging"**.

---

## 6. Safety guarantees

- **Credit deduction is atomic and post-success only** — RPC returns boolean; any failure path skips deduction.
- **Backward compat**:
  - Existing `rsvp_invite_purchases` rows continue to gate access (no logic change).
  - Existing notification_settings table preserved (Twilio columns ignored, never re-written).
  - Resend email flow untouched.
  - Reminder scheduling unchanged — it just calls the new `send-rsvp-sms` which now enforces credits.
- **Hard zero-state**: when `remaining === 0`, every SMS send entry-point is disabled at component level (button `disabled`, visual locked state) AND server-side (function returns 402-style block).

---

## 7. Files touched

```
supabase/migrations/<new>.sql
supabase/functions/_shared/sms-service.ts                  # NEW
supabase/functions/send-rsvp-sms/index.ts                  # rewrite
supabase/functions/verify-payment/index.ts                 # 2 new branches
supabase/functions/create-sms-topup-checkout/index.ts      # NEW
src/lib/smsPricing.ts                                      # NEW
src/lib/stripePrices.ts                                    # add SMS_TOPUP
src/hooks/useSmsCredits.ts                                 # NEW
src/hooks/useNotificationSettings.ts                       # SMS writes removed
src/components/Admin/AdminNotificationSettings.tsx         # remove Twilio block
src/components/Dashboard/SmsCreditMeter.tsx                # NEW
src/components/Dashboard/SmsTopupModal.tsx                 # NEW
src/components/Dashboard/RsvpActivationModal.tsx           # relabel + 250 credits bullet
src/components/Dashboard/GuestListTable.tsx                # meter + zero-state lock (drawer only)
src/components/Account/BillingCard.tsx, HistoryCard.tsx    # new line items + balance
```

Ready to implement.
