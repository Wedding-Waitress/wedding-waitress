## Smart RSVP & Messaging Modal Upgrade

Update the RSVP activation modal + trigger label to reflect the new credit-based messaging system. Scope is intentionally narrow — no changes to locked Guest List table layouts or other RSVP modals.

### 1. Trigger button wording
File: `src/components/Dashboard/GuestBulkActionsBar.tsx` (line 233)
- "Send Email & SMS via Wedding Waitress" → "Send Email or SMS via Wedding Waitress"
- Update adjacent comment on line 225 to match.

### 2. RsvpActivationModal — delivery method selector
File: `src/components/Dashboard/RsvpActivationModal.tsx`

Add a new section ABOVE the pricing card with three selectable cards:
- Email Invitations (Mail icon)
- SMS Invitations (Phone icon)
- Email + SMS Invitations (both icons)

Behaviour:
- Single-select (radio-style cards) — picking one swaps selection
- New state: `const [method, setMethod] = useState<'email' | 'sms' | 'both' | null>(null)`
- Selected card uses premium styling: `border-primary ring-2 ring-primary/30 bg-primary/5 lv-premium-shade`
- Unselected: `border-border hover:border-primary/50 hover:bg-muted/40`
- Mobile: stack vertically (`grid grid-cols-1 sm:grid-cols-3 gap-2`)
- 44px+ tap targets

### 3. Bundle bullets (replace existing 2-item list)
New list:
- ✓ Unlimited Email Invitations
- ✓ 250 SMS Credits Included
- ✓ Smart RSVP Tracking
- ✓ Guest Delivery History
- ✓ RSVP Response Monitoring

### 4. Pricing card copy
- Keep `Based on your guest list (...)` and `$X AUD`
- Replace `One-time payment per event • Includes both Email & SMS` with two lines:
  - `One-time activation per event`
  - small muted: `Includes 250 SMS credits + unlimited email invitations.`

### 5. Usage clarification (under pricing card)
Small muted text:
> "SMS credits are only consumed when sending SMS invitations. Additional SMS credits can be purchased anytime."

### 6. Validation + Pay button
- `Pay Now` disabled when: `!method || loading || !eventId`
- Inline message under the selector when `method === null` AND user has attempted (or always show muted hint): "Please select at least one invitation method."
- In `handlePayNow`, guard: if `!method` show toast and return.

### 7. Checkout metadata (future-ready analytics)
Pass selected method through to Stripe checkout body:
```ts
const body = {
  price_id: tier.price_id,
  mode: 'payment',
  event_id: eventId,
  plan_type: 'rsvp',
  delivery_method: method,           // 'email' | 'sms' | 'both'
  metadata: { delivery_method: method },
};
```
`supabase/functions/create-checkout/index.ts` — accept `delivery_method` and forward it into `session.metadata` (and subscription_data.metadata if present) so `verify-payment` and future analytics can read it. No business-logic branching yet (credits already grant 250 regardless; SMS only consumed on actual send).

### 8. Out of scope (explicitly NOT touched)
- Locked desktop Guest List table
- `SendRsvpConfirmModal`, `RsvpAlreadyPaidModal`, `RsvpOverageModal`, `RsvpPaymentSuccessModal`
- Credit grant logic, SMS top-up flow, edge functions other than `create-checkout` metadata pass-through
- Snapshot file under `.lovable/snapshots/...`

### Technical notes
- Keep existing retry/iframe break-out logic in `handlePayNow` intact
- Selected-card styling uses existing semantic tokens + `lv-premium-shade`
- All new buttons get `lv-premium-shade` per global rule
- The "LOCKED" header on `RsvpActivationModal.tsx` predates the credit-based migration; this update is explicitly authorised by the current request, so the file will be modified and the header comment updated to note the 2026-05-08 messaging-system upgrade.

### Testing checklist
- Modal opens with no method preselected → Pay disabled, hint visible
- Selecting each card highlights it and enables Pay
- Switching selection updates state correctly
- Pay Now sends `delivery_method` in checkout body (verify in network tab)
- Mobile (≤640px): cards stack, footer buttons stay equal-width
- Trigger button now reads "Send Email or SMS via Wedding Waitress"
