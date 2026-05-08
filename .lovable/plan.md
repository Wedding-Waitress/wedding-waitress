## Smart RSVP — Phase 1: Real Twilio Delivery Tracking

Backend-first foundation. No new pages. No locked-UI changes. All intelligence flows into existing Guest List / Analytics panel / Communications surfaces.

### 1. Database migration (single file)

Extend `public.sms_send_logs` (some columns already exist — additions only):

- add `failed_at timestamptz`
- add `twilio_error_code text` (alias kept; existing `error_code` retained, new col mirrors Twilio raw code)
- add `twilio_error_message text`
- add `raw_twilio_status text`
- add `webhook_payload jsonb`
- add `idx_sms_send_logs_guest_id` on `(guest_id)`
- add `idx_sms_send_logs_event_id` on `(event_id)`
- (existing) unique `twilio_sid` index, `event_id+last_status_at desc` index — keep

Extend the existing `update_sms_delivery_status` RPC signature to:

```
update_sms_delivery_status(
  _twilio_sid text,
  _status text,
  _error_code text default null,
  _error_message text default null,
  _raw_status text default null,
  _payload jsonb default null
) returns boolean  -- SECURITY DEFINER
```

Behaviour:
- locate row by `twilio_sid`
- normalize status → enum
- set `delivered_at = now()` when status `delivered`
- set `failed_at = now()` when status in (`failed`,`undelivered`,`blocked`)
- always update `last_status_at`, `raw_twilio_status`, `webhook_payload`, `twilio_error_code`, `twilio_error_message`
- preserve existing `error_code`/`error_message` if new values null
- return true if a row was updated

### 2. New edge function: `twilio-delivery-webhook`

Path: `supabase/functions/twilio-delivery-webhook/index.ts`
Config: `verify_jwt = false` in `supabase/config.toml` (Twilio cannot send Supabase JWTs).

Responsibilities:
- Accept `POST` `application/x-www-form-urlencoded` from Twilio
- Validate `X-Twilio-Signature` using `TWILIO_AUTH_TOKEN` and the full request URL + sorted form params (HMAC-SHA1, base64). Reject with 403 on mismatch. Log masked failures.
- Parse: `MessageSid`, `MessageStatus`, `ErrorCode`, `ErrorMessage`, `To`, `From`, `SmsStatus`
- Map Twilio → internal status:
  - `queued` → `queued`
  - `accepted`/`sending`/`sent` → `sent`
  - `delivered` → `delivered`
  - `undelivered` → `undelivered` (treated as failed for resend logic)
  - `failed` → `failed`
  - `blocked` (Twilio code 30004/30005/30006 family) → `blocked`
- Call `update_sms_delivery_status` RPC via service-role client with full payload
- Always return 200 to Twilio after handling (even unknown SID) to prevent retries storm; log unknown SIDs
- CORS: not needed (Twilio→server), but include OPTIONS handler returning 200

### 3. Outbound integration update

`supabase/functions/_shared/sms-service.ts`:
- When constructing the Twilio `Messages.json` POST, append `StatusCallback` = `${SUPABASE_URL}/functions/v1/twilio-delivery-webhook`
- Keep existing queued-log → sent transition; webhook later upgrades to delivered/failed/blocked

No changes to credit consumption logic.

### 4. Resend Smart RSVP — real failed targeting

`src/components/Dashboard/ResendSmartRsvpModal.tsx` (and any Smart RSVP analytics resend hooks):
- "Resend only failed SMS" now filters guests whose **latest** `sms_send_logs` row for the event has `status in ('failed','undelivered','blocked')` AND no later `delivered`
- Exclude: `delivered`, `queued`, `sent`, `pending`
- Use a small selector helper backed by a query joining latest log per guest

### 5. Delivery badges — real states

`src/components/Dashboard/GuestDeliveryBadges.tsx` (existing, inline only — no new columns):
- Source from latest `sms_send_logs` row per guest (already wired to logs; switch the status mapping)
- Color priority:
  - `delivered` → green
  - `queued`/`sent` → amber
  - `failed`/`undelivered` → red
  - `blocked` → dark red
- Keep current chip footprint (Email / SMS / Email+SMS / Responded)
- Render in: RSVP Status cell (desktop inline), mobile/tablet cards, Smart RSVP Analytics panel rows

### 6. Smart RSVP Analytics panel enhancements (no redesign)

`src/components/Dashboard/SmartRsvpAnalyticsPanel.tsx`:
- Per-row status reflects real webhook state
- Add `last_status_at` timestamp shown next to status pill ("Updated 2m ago")
- Add tooltip on failed rows showing `twilio_error_code` + `twilio_error_message`

### 7. Security

- Twilio signature validation mandatory
- Service-role key only used inside the edge function
- Webhook never trusts client-supplied `MessageSid` outside Twilio-signed payloads
- Suspicious requests logged with masked phone, no secrets

### 8. Out of scope (Phase 2+)

Low-credit UI, projected sends, guest timelines, advanced KPI cards, response-time analytics, open/click tracking, heatmaps.

### Affected files

- `supabase/migrations/<new>.sql` (new)
- `supabase/functions/twilio-delivery-webhook/index.ts` (new)
- `supabase/config.toml` (add function entry, `verify_jwt = false`)
- `supabase/functions/_shared/sms-service.ts` (add StatusCallback)
- `src/components/Dashboard/GuestDeliveryBadges.tsx` (real-status mapping)
- `src/components/Dashboard/SmartRsvpAnalyticsPanel.tsx` (timestamp + error tooltip)
- `src/components/Dashboard/ResendSmartRsvpModal.tsx` (real failed filter)
- `src/hooks/useMessagingAnalytics.ts` (add latest-log-per-guest selector if missing)

### Testing instructions

1. Apply migration; confirm columns + indexes exist (`\d sms_send_logs`).
2. Send a test SMS from Guest List → row appears with `status='sent'`, `twilio_sid` populated.
3. Tail edge function logs: `twilio-delivery-webhook`. Twilio fires `queued` → `sent` → `delivered` callbacks; verify each transition updates `status`, `last_status_at`, `delivered_at`.
4. Force a failure (invalid number `+15005550001` Twilio magic) → row becomes `failed`, `failed_at` set, error code/message captured.
5. Open Smart RSVP Analytics panel → row shows real status + relative timestamp; failed row shows error tooltip.
6. Open Resend Smart RSVP → "Resend failed SMS" lists only the magic-number guest.
7. Tamper the `X-Twilio-Signature` header → webhook returns 403 and DB unchanged.

### Twilio Console configuration

Per-message `StatusCallback` is set in code, so **no Console change is required**. Optional hardening: in Messaging Service → Integration, set Status Callback URL to:

```
https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/twilio-delivery-webhook
```

Webhook URL: `https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/twilio-delivery-webhook`

Required secret already present: `TWILIO_AUTH_TOKEN` (used for signature validation).
