

## Fix: "Stripe Not Connected" Error on RSVP Activation

### What's Wrong

The `RsvpActivationModal` component at the bottom of `GuestListTable.tsx` (line 1917) is **missing the `eventId` prop**. Without it, the modal's internal Stripe checkout logic falls back to the `onPayNow` callback, which is a placeholder that shows "Stripe Not Connected."

Stripe itself IS connected -- the secret key is configured, the edge functions are deployed. This is purely a missing prop.

### The Fix

**File:** `src/components/Dashboard/GuestListTable.tsx`

**Change:** Add `eventId={selectedEventId}` to the `RsvpActivationModal` component (around line 1917).

Before:
```tsx
<RsvpActivationModal
  isOpen={showActivationModal}
  onClose={() => setShowActivationModal(false)}
  totalGuestCount={guests.length}
  onPayNow={() => { ... }}
/>
```

After:
```tsx
<RsvpActivationModal
  isOpen={showActivationModal}
  onClose={() => setShowActivationModal(false)}
  totalGuestCount={guests.length}
  eventId={selectedEventId}
  onPayNow={() => { ... }}
/>
```

This one-line addition ensures the modal uses its built-in Stripe checkout flow (calling the `create-checkout` edge function) instead of the fallback placeholder.

### Why This Is Safe

- The `RsvpActivationModal` already has full Stripe integration built in (lines 35-67 of `RsvpActivationModal.tsx`)
- The `create-checkout` edge function is already deployed and working
- The `STRIPE_SECRET_KEY` secret is already configured in Supabase
- No other files need to change

