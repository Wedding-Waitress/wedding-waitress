# Stripe Return + Success UX Fix (RSVP Invite Purchases)

Currently after Stripe checkout, the user lands on `/payment-success`, then auto-redirects to `/dashboard?tab={returnTab}&success=true`. We will route RSVP purchases specifically back to the Guest List with a `payment=success` flag plus payment details, then surface a new in-product success modal.

## Scope (touch only what's listed)
- `src/pages/PaymentSuccess.tsx` — change redirect destination for RSVP purchases.
- `src/components/Dashboard/RsvpActivationModal.tsx` — store `selectedGuestCount` for return display; ensure `returnTab='guest-list'`.
- `src/components/Dashboard/RsvpOverageModal.tsx` — same returnTab + selected count storage.
- `src/components/Dashboard/GuestListTable.tsx` — read `payment=success` query, close Manage Selected modal, clear selections, open new success modal, then strip the query.
- NEW: `src/components/Dashboard/RsvpPaymentSuccessModal.tsx`.

Do NOT touch: `create-checkout`, `verify-payment`, RSVP tier/overage business logic, guest table layout, Activation/Overage modal internals beyond the small additions above.

## 1. Redirect destination (PaymentSuccess.tsx)
Replace the current `returnDest` builder with RSVP-aware logic:

```ts
const isRsvp = details.type === "rsvp" || details.type === "rsvp_overage";
const returnTab = (() => {
  try { return sessionStorage.getItem('ww:returnTab') || (isRsvp ? 'guest-list' : 'account'); }
  catch { return isRsvp ? 'guest-list' : 'account'; }
})();
const params = new URLSearchParams();
params.set('tab', returnTab);
if (isRsvp) {
  params.set('payment', 'success');
  if (sessionId) params.set('session_id', sessionId);
  if (details.plan_name) params.set('tier', details.plan_name);
  if (details.amount_paid != null) params.set('amount', String(details.amount_paid));
  params.set('ptype', details.type!); // 'rsvp' or 'rsvp_overage'
} else {
  params.set('success', 'true');
}
const returnDest = `/dashboard?${params.toString()}`;
```

The existing 8-second auto-redirect and "Go to Dashboard" buttons reuse `returnDest` unchanged.

`verify-payment` already returns `{ type: 'rsvp' | 'rsvp_overage', plan_name, amount_paid, ... }` — no backend change needed.

## 2. Pre-checkout: remember Guest List + selected count
In both `RsvpActivationModal.tsx` and `RsvpOverageModal.tsx`, just before the iframe-breakout redirect:

```ts
try {
  sessionStorage.setItem('ww:returnTab', 'guest-list');
  sessionStorage.setItem('ww:rsvpSelectedCount', String(selectedGuestCount ?? 0));
} catch {}
```

`selectedGuestCount` is already a prop on both modals (used in pricing display).

## 3. Guest List return handler (GuestListTable.tsx)
Add an effect near the top of the component:

```ts
const [searchParams, setSearchParams] = useSearchParams();
const [successModal, setSuccessModal] = useState<null | {
  guestCount: number; tierLabel: string; amount: number; ptype: 'rsvp' | 'rsvp_overage';
}>(null);

useEffect(() => {
  if (searchParams.get('payment') !== 'success') return;
  // Close the old "Manage Selected Guests" bulk modal + clear selection state
  setShowBulkActions(false);     // existing state
  setSelectedGuests(new Set());  // existing setter (or equivalent)
  // Build modal data from query params + sessionStorage
  const guestCount = Number(sessionStorage.getItem('ww:rsvpSelectedCount') || '0');
  const tierLabel = searchParams.get('tier') || '';
  const amount = Number(searchParams.get('amount') || '0');
  const ptype = (searchParams.get('ptype') as 'rsvp' | 'rsvp_overage') || 'rsvp';
  setSuccessModal({ guestCount, tierLabel, amount, ptype });
  // Trigger allowance refetch (already exists via focus, but be explicit)
  refetchRsvpPurchase?.();
  // Clean URL — keep only `tab`
  const next = new URLSearchParams();
  const tab = searchParams.get('tab'); if (tab) next.set('tab', tab);
  setSearchParams(next, { replace: true });
  try { sessionStorage.removeItem('ww:rsvpSelectedCount'); } catch {}
}, [searchParams]);
```

(Exact existing state names verified during implementation — `showBulkActions`, selection set, and `refetchRsvpPurchase` are already in this file.)

Render `<RsvpPaymentSuccessModal open={!!successModal} data={successModal} onClose={() => setSuccessModal(null)} />` alongside the other modals.

## 4. New component: `RsvpPaymentSuccessModal.tsx`
Built on existing `Dialog` primitive, matching brand styling (`#967A59` accents, brown headings, green check icon).

```
┌─────────────────────────────────────────────┐
│            ✓  (green check circle)          │
│           Payment Successful                │
│                                             │
│ Your RSVP invitations have been             │
│ successfully sent to your selected guests.  │
│                                             │
│ You should start receiving replies soon.    │
│ Please check your dashboard regularly       │
│ for updates.                                │
│                                             │
│   ┌──────────────────────────────────────┐  │
│   │  78 guests invited                   │  │
│   │  1–100 Guests RSVP Bundle            │  │
│   │  $99 AUD                             │  │
│   └──────────────────────────────────────┘  │
│                                             │
│                  [ Done ]                   │
└─────────────────────────────────────────────┘
```

Props: `{ open: boolean; data: { guestCount; tierLabel; amount; ptype } | null; onClose: () => void }`. "Done" calls `onClose` only (no navigation). For `ptype === 'rsvp_overage'`, swap the bundle line to "Additional RSVP Allowance ({guestCount} guests)". Amount renders as `$${amount.toFixed(2)} AUD`.

## 5. Auto-refresh (already in place — verify only)
- `useRsvpPurchase` already refetches on `focus` and `visibilitychange`.
- We add an explicit `refetchRsvpPurchase()` call in the return handler so the badge updates the instant the modal opens (no wait for tab focus).

## Expected result
1. User pays on Stripe.
2. Brief stop on `/payment-success` (verifies + shows existing "Payment Successful" card for ~1–2s, but now redirects to Guest List instead of homepage/account).
3. Lands on `/dashboard?tab=guest-list` with old bulk modal closed and selections cleared.
4. New `RsvpPaymentSuccessModal` opens with guest count, tier label, amount.
5. URL is cleaned to `/dashboard?tab=guest-list`.
6. Allowance badge reflects the new tier/overage immediately.

No changes to checkout, verification, pricing, or the locked Guest List table layout.
