## Smart SMS Credit Status — Premium Credit Intelligence Layer

Goal: turn hidden SMS credit state into a calm, premium, glanceable surface inside the Smart RSVP ecosystem — without new pages, new sidebar entries, or layout changes to locked surfaces.

### 1. New component — `SmartSmsCreditStatus`

File: `src/components/Dashboard/SmartSmsCreditStatus.tsx`

Reusable, premium status card. Two visual variants via prop:
- `variant="full"` — used in Guest List top controls row.
- `variant="compact"` — used as a header strip inside Smart RSVP Analytics panel.

Data source: existing `useSmsCredits(eventId)` hook (already realtime-synced via the `sms_credits` channel + extended after webhook updates by reusing the same hook). No new hooks required for fetching.

Display elements:
- Headline: `"{remaining} SMS Credits Remaining"`.
- Sub-headline: `"Approx. {remaining} more SMS invitations"` (1 credit ≈ 1 invitation; future-ready helper accepts an optional `recipientCount` prop for "Enough for ~X more campaigns").
- Health pill (Healthy / Low / Critical / Empty) with semantic color tokens.
- Calm contextual message line (matches health state).
- "Top Up Credits" pill button — `lv-premium-shade`, wired to existing `useSmsTopup().startTopup(eventId)` (no new Stripe code).

States and thresholds (overrides hook's percent-based `isLow` with absolute thresholds per spec):
- Healthy: `remaining >= 100` → green accent, "running smoothly" copy, no warning.
- Low: `25 <= remaining <= 99` → amber accent, "running low" copy.
- Critical: `1 <= remaining <= 24` → red accent, "Only {n} SMS credits remaining."
- Empty: `remaining === 0` (and `total > 0`) → red locked state, "You've used all included SMS credits.", Top Up CTA emphasised.
- Unactivated (`total === 0`): render nothing in `compact`; in `full` show a muted "Smart RSVP not active yet" line (no CTA noise).

Styling: Wedding Waitress card surface, rounded-2xl, soft shadow, semantic tokens only. No raw color classes.

### 2. Placement (only two)

A. Guest List top controls row — `src/components/Dashboard/GuestListTable.tsx`
- Mount `<SmartSmsCreditStatus variant="full" eventId={eventId} />` in the existing controls/feature-strip area near `SmartRsvpFeatureStrip` / Analytics / Resend buttons (around the existing strip at line ~1695).
- No column changes, no table-structure changes (locked desktop table preserved).

B. Smart RSVP Analytics panel — `src/components/Dashboard/SmartRsvpAnalyticsPanel.tsx`
- Mount `<SmartSmsCreditStatus variant="compact" eventId={eventId} />` at the top summary area, above the existing per-guest rows.
- Add a compact KPI chip row beneath it (see §4).

The legacy `SmsCreditMeter` is left untouched (still works elsewhere if used) but the Guest List instance is replaced by the new component to avoid duplication. (If `SmsCreditMeter` is currently mounted in the same Guest List spot, swap it; otherwise leave alone.)

### 3. Guest List delivery-badge low-credit pill

Inside `GuestDeliveryBadges.tsx` (or the badge cell already rendered in the Send RSVP & Invite column):
- When `remaining <= 24`, render a tiny inline `"Low Credits"` pill alongside the existing badge.
- Pure additive — no column added, no width change, no layout shift on healthy state.
- Reads credits via `useSmsCredits` (already realtime).

### 4. Analytics KPI chips

Inside `SmartRsvpAnalyticsPanel.tsx`, a new compact `KpiChips` row (in same file, no new component file needed) shows:
- Credits Remaining (from `useSmsCredits`)
- Credits Used (from `useSmsCredits`)
- SMS Delivered (count where latest `sms_send_logs.status = 'delivered'`)
- SMS Failed (count where latest status in `failed | undelivered | blocked`)
- Delivery Success % (`delivered / (delivered + failed)` rounded, `—` if zero)

Computed from data already loaded by the panel — no extra queries. Styling matches existing analytics chips (no redesign).

### 5. Empty-credit protection

When `isEmpty` (`remaining === 0`, `total > 0`):
- Disable SMS send + resend SMS actions: pass an `smsDisabled` flag (derived from `useSmsCredits`) into:
  - The "Send RSVP & Invite" SMS button row in `GuestListTable.tsx`.
  - `ResendSmartRsvpModal.tsx` "Resend SMS" / "Resend only failed SMS" buttons.
- Keep email actions fully enabled.
- Tooltip / inline helper on disabled buttons: `"SMS credits required to continue Smart RSVP messaging."`
- The full credit card already surfaces the Top Up CTA.

### 6. Realtime strategy

- `useSmsCredits` already subscribes to `sms_credits` postgres changes for the event. This covers: send (decrement), top-up (increment), webhook-triggered adjustments (any future credit refund), resend.
- All consumers (`SmartSmsCreditStatus` full + compact, badge low-credit pill, KPI chips, send-button disabled state) share this hook → one subscription per mount, all UI updates atomically.
- No new channels, no polling.

### 7. Projection logic (lightweight, no ML)

Helper `projectSends(remaining, recipientCount?)`:
- Default: `1 credit ≈ 1 SMS invitation` → "Approx. {remaining} more SMS invitations".
- If `recipientCount` provided (selected guests with mobile + SMS pref): `campaigns = floor(remaining / max(1, recipientCount))` → "Enough for approximately {campaigns} more RSVP campaigns."
- Pure function in component file; no analytics, no historical averages in this phase.

### 8. Threshold + lock logic (single source of truth)

Add `getCreditHealth(remaining, total)` helper inside the new component file, returning `{ state: 'healthy'|'low'|'critical'|'empty'|'unactivated', tone, message }`. Reused by:
- The full + compact card.
- The `Low Credits` badge pill (`state === 'critical' || state === 'empty'`).
- The SMS-button disabled flag (`state === 'empty'`).

### 9. Out of scope (explicit)

No auto top-up, subscription plans, usage billing, AI optimisation, heatmaps, advanced forecasting, spend analytics, separate billing pages, new dashboard sections, or admin panels. No edits to: locked desktop guest table, Step 1/2/3 cards, payment modal UI, routing, sidebar, public pages, Stripe wiring.

### 10. Affected files

- `src/components/Dashboard/SmartSmsCreditStatus.tsx` (new)
- `src/components/Dashboard/GuestListTable.tsx` (mount full variant in top controls; pass `smsDisabled` to SMS send buttons)
- `src/components/Dashboard/SmartRsvpAnalyticsPanel.tsx` (mount compact variant + KPI chips row)
- `src/components/Dashboard/GuestDeliveryBadges.tsx` (inline `Low Credits` pill when `remaining <= 24`)
- `src/components/Dashboard/ResendSmartRsvpModal.tsx` (disable SMS resend buttons + tooltip when empty)

No DB migrations, no edge function changes, no new hooks.

### 11. Testing checklist

- Healthy (≥100): green accent, no warning, sends enabled.
- Low (25–99): amber accent, calm "running low" copy, sends enabled, no badge pill.
- Critical (1–24): red accent, stronger copy, `Low Credits` pill renders inline in delivery badge cell, sends still enabled.
- Empty (0, total>0): locked red state, SMS send + resend SMS disabled with tooltip, email send still works, Top Up CTA prominent.
- Unactivated (total=0): full variant shows muted "not active" line, compact variant renders nothing.
- Top Up CTA launches existing Stripe topup flow (no regressions to payment modal).
- After successful send: `sms_credits` realtime event updates all surfaces (card, KPI chips, badge pill, button disabled state) without refresh.
- After top-up webhook: credits jump up, locked state clears, SMS buttons re-enable live.
- Locked desktop Guest List table layout unchanged (visual diff vs snapshot).
- Mobile + tablet: full card stacks cleanly; compact chips wrap; no horizontal scroll.

### 12. Updated areas summary

- Guest List → top controls row gains the `SmartSmsCreditStatus` (full).
- Guest List → delivery badge cell gains conditional `Low Credits` micro-pill.
- Guest List → SMS send buttons disabled when empty.
- Smart RSVP Analytics → compact credit status header + KPI chips row.
- Resend Smart RSVP modal → SMS resend buttons disabled when empty.
