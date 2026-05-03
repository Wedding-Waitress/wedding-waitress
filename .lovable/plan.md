# Fix Send RSVP/Invite Flow — Selection Guard + Already-Paid Modal

## Problem
1. Clicking "Send Email & SMS via Wedding Waitress" opens the payment modal even when **no guest is selected** (no individual guest, no "Select All", no search-add).
2. After a user has paid for a tier (e.g. 1–100 guests at $99), the system still shows the "Activate and Send RSVP Invites" payment popup the next time — instead of confirming they're already covered and showing remaining quota.

## Solution Overview

### A. Selection Guard
In `GuestListTable.tsx` (the `onSendEmail` / `onSendSms` handlers passed to `GuestBulkActionsBar`), add a guard at the very top:
- If `selectedGuestIds.size === 0` → show a destructive toast: *"No guests selected — Please select at least one guest, use 'Select All Guests', or add guests from the search bar before sending."* and `return` immediately.
- This blocks both the activation/payment modal AND the send-confirmation modal from opening with zero recipients.

### B. "Already Paid" Modal (new)
Create a new component `src/components/Dashboard/RsvpAlreadyPaidModal.tsx` that appears instead of `RsvpActivationModal` when the user has already purchased a tier that still covers their current guest count.

It will display:
- Title: **"You're already activated"** with a green check icon
- Tier they paid for (e.g. *"1–100 guests"*) and amount paid (from `rsvp_invite_purchases.amount_paid` + `guest_tier_label`)
- Date of purchase
- Current usage line: *"You have X of Y guests in your list — Z guests remaining at no extra cost."*
- A note: *"You can keep sending Email & SMS invites for this event at no additional charge as long as your guest count stays within this tier."*
- Footer: green **"Continue to Send Invites"** (LEFT) opens the existing `SendRsvpConfirmModal`; red **"Cancel"** (RIGHT). Mobile rules respected (h-11, equal width, max-lg:px-3).

### C. Decision Logic in `GuestListTable.tsx`
Replace the current branching:
```
if (hasRsvpPurchase) → SendModal
else → ActivationModal
```
with three-way logic using the existing `getPricingTier(currentGuestCount)` and the actual purchased tier label:

1. **No selection** → toast + return (Section A).
2. **Has purchase AND current guest count is still within the purchased tier's max** → open new `RsvpAlreadyPaidModal`. From there, "Continue" opens `SendRsvpConfirmModal`.
3. **Has purchase BUT current guest count now exceeds the purchased tier** → open `RsvpActivationModal` (they need to upgrade tier).
4. **No purchase** → open `RsvpActivationModal` (current behavior).

### D. Extend `useRsvpPurchase` Hook
Currently returns only `hasPurchased: boolean`. Extend it (without breaking existing callers) to also return the latest completed purchase row so we can read `guest_tier_label` and `amount_paid`:
```ts
return { hasPurchased, purchase, loading, getPricingTier };
```
Where `purchase` is `{ amount_paid, guest_tier_label, created_at } | null`. Add a small helper `getTierMaxFromLabel(label)` (parses `"1–100 guests"` → `100`, `"501–1000 guests"` → `1000`) so we can compare to current guest count.

## Files to Edit / Create

| File | Change |
|------|--------|
| `src/hooks/useRsvpPurchase.ts` | Fetch & expose latest completed purchase row; export `getTierMaxFromLabel` helper |
| `src/components/Dashboard/RsvpAlreadyPaidModal.tsx` | **NEW** — confirmation modal for already-paid users within tier |
| `src/components/Dashboard/GuestListTable.tsx` | Add empty-selection guard in `onSendEmail`/`onSendSms`; add three-way branching; render new modal |

## Files NOT Touched
- `RsvpActivationModal.tsx` (locked production component — left untouched)
- `GuestBulkActionsBar.tsx` (no UI change there; logic lives in parent)
- `stripePrices.ts` / Stripe checkout flow (already correct)

## Expected Behaviour After Fix
- Clicking Send Email & SMS with **0 guests selected** → red toast, nothing opens.
- First time, with a selection → payment modal → Stripe checkout (unchanged).
- After successful payment, with selection still within tier → new "You're already activated" modal showing what they paid + remaining quota → Continue → Send confirmation → invites go out, **no extra charge**.
- After payment, but guest count grew beyond tier → payment modal reappears so they can upgrade tier.
