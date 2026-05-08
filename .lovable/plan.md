## Smart RSVP & Messaging — Final Hardening

Two small additions before declaring production-ready, then final QA.

### 1. Delivery-status readiness in `sms_send_logs`

Migration:
- Replace the existing free-text `status` with a Postgres enum `sms_delivery_status` containing: `queued`, `sent`, `delivered`, `undelivered`, `failed`, `blocked`.
- Add nullable columns: `delivered_at timestamptz`, `last_status_at timestamptz default now()`, `error_code text` (Twilio numeric error code, separate from `error` message).
- Add unique index on `twilio_sid` (partial, where not null) so future webhooks can upsert by SID.
- Add index on `(event_id, last_status_at desc)` for history view performance.
- Update `log_sms_send` RPC to accept the enum and set `last_status_at = now()`.
- Add (but do not wire yet) a `update_sms_delivery_status(_twilio_sid, _status, _error_code, _error)` SECURITY DEFINER RPC — placeholder for the future webhook.

Code:
- `sms-service.ts`: write initial log as `queued` immediately before the Twilio call, then update to `sent`/`failed`/`blocked` after the response (so future webhook updates flow naturally from `sent → delivered/undelivered`).
- `SmsLogsHistory.tsx`: render the new statuses with appropriate badge colors; gracefully handle rows still on the old values.

No webhook endpoint, no Twilio status-callback wiring — schema and helpers only.

### 2. Anti-double-click / duplicate-checkout protection

`useSmsTopup`:
- Guard re-entry with a ref (`inFlightRef`) in addition to the `loading` state so rapid double-clicks before React re-renders are also blocked.
- Use the existing `PaymentProcessingContext` (`startProcessing`) on click and only `stopProcessing` on error — successful path keeps the global overlay through the Stripe redirect, matching how other purchases behave.
- Idempotency: pass a generated `idempotency_key` (uuid, stable per click attempt) in the `create-checkout` body so a retried invoke cannot create two Stripe sessions; `create-checkout` forwards it as Stripe's `Idempotency-Key` header on `checkout.sessions.create`.

`SmsCreditMeter.tsx` (and any other top-up CTA):
- Disable the button as soon as it's clicked using both `topupLoading` and the global `processing` flag.
- Show a `Loader2` spinner + "Starting checkout…" label while pending.
- Add `aria-busy` and `pointer-events-none` for safety.

`create-checkout` edge function:
- Accept optional `idempotency_key`; if present, pass `{ idempotencyKey }` as the Stripe request options. No behavior change when absent.

### 3. Final QA + deployment verification

Audit pass (ripgrep) across the repo for any remaining:
- "Connect Twilio" / "Twilio credentials" / "twilio_account_sid" UI strings or fields
- Old `notification_settings` Twilio columns referenced anywhere
- Hard-coded SMS pricing or 250-credit literals outside `stripePrices.ts` / `sms_pricing_constants`
- Top-up CTAs missing the disabled/loading guard
- Edge function imports/paths

Manual + tool checks:
- Deploy `send-rsvp-sms`, `verify-payment`, `create-checkout`; tail logs for cold-start errors.
- `supabase--curl_edge_functions` smoke tests: top-up checkout creation, send-sms with zero credits (expect `blocked`), send-sms happy path on a test event.
- Verify `useSmsCredits` realtime updates after a simulated `consume_sms_credit`.
- Confirm `SmsLogsHistory` renders new + legacy rows.
- Verify Account → Usage shows credit balance correctly.

### Deliverables at the end

- Files changed list
- New migration summary
- New/updated edge functions
- Stripe flow recap (initial grant + $99 top-up, idempotent)
- Testing checklist with pass/fail
- Any remaining manual steps (Twilio status-callback URL config — deferred until webhook is built)

### Locked surfaces

No changes to locked public/dashboard pages, Guest List desktop table, or any snapshot-protected file.
