

## RSVP Invite Activation + Free Plan Implementation

This plan covers two interconnected features you described. Here is my understanding and proposed approach:

---

### Feature 1: RSVP Invite Activation with Stripe Payment

**How it works for the user:**
1. The event organizer clicks a toggle or button to "Activate RSVP Invites" for their event
2. A popup automatically appears showing the price based on their current guest count (e.g., 200 guests = $149 AUD)
3. The popup has a "Pay Now" button that connects to Stripe Checkout
4. Only after successful payment can they use the "Send Email" and "Send SMS" buttons
5. The payment is one-time per event and unlocks both channels permanently for that event

**What needs to be built:**
- A new database table `rsvp_invite_purchases` to track which events have paid for RSVP sending (event_id, user_id, amount_paid, stripe_session_id, status, guest_tier_at_purchase, created_at)
- A new Edge Function `create-rsvp-checkout` that creates a Stripe Checkout session with the correct price based on guest count
- A Stripe webhook Edge Function (or extend existing) to mark the purchase as complete when payment succeeds
- An "Activate RSVP Invites" toggle/button in the dashboard that triggers the payment popup
- The existing "Send Email" / "Send SMS" buttons will check if the event has a completed purchase before allowing sending

**Stripe Integration:** Stripe has not been connected yet. We will need to enable Stripe before implementing the payment flow. This is a prerequisite.

---

### Feature 2: Free Plan (24-Hour Trial)

**Rules you specified:**
- Maximum 20 guests
- Maximum 5 tables
- 24-hour time limit from account creation
- Cannot access "Send RSVP Invite" at all
- After 24 hours (or next login), a popup appears prompting them to choose a paid plan

**What already exists:**
- A `subscription_plans` table with a "Starter" plan (20 guest limit, $0, 30-day duration)
- A `user_subscriptions` table with status, expires_at, is_read_only fields
- A `get_user_plan()` database function that returns the user's current plan
- The Starter plan already has `can_send_email: false` and `can_send_sms: false`

**What needs to change:**
- Update the Starter plan duration from 30 days to 1 day (24 hours)
- Add a `table_limit` column to `subscription_plans` (Starter = 5, others = NULL/unlimited)
- Enforce the table limit in the frontend when creating tables
- Enforce the guest limit in the frontend when adding guests
- Build a "Plan Expired" popup that appears when the trial is over, prompting upgrade
- Auto-assign every new user to the Starter plan on signup (if not already done)

---

### Implementation Sequence

1. **Enable Stripe** -- This must happen first as a prerequisite for payment
2. **Database changes** -- Add `rsvp_invite_purchases` table, update Starter plan duration, add table_limit column
3. **Edge Functions** -- Create Stripe checkout session function, webhook handler
4. **Frontend: RSVP Activation Popup** -- The payment modal with auto-calculated price and Stripe redirect
5. **Frontend: Free Plan Enforcement** -- Guest/table limits, trial expiry popup, RSVP send block
6. **Frontend: Post-Payment Flow** -- Unlock Send Email/SMS buttons after successful purchase

---

### What I Recommend Doing Now

Since Stripe is not yet connected, I recommend we:

1. **Record the pricing and business rules in the database now** -- Update the Starter plan, add the `rsvp_invite_purchases` table structure, and add table limits
2. **Build the frontend enforcement for the free plan** -- Guest limit (20), table limit (5), and RSVP send blocking for Starter users
3. **Build the RSVP activation popup UI** -- The modal that shows the correct price based on guest count, with a "Pay Now" button (which will connect to Stripe once enabled)
4. **Defer actual Stripe integration** to the next step when we enable Stripe

This way, all the business logic and UI is in place, and we just need to wire up Stripe as the final step.

---

### Technical Details

**New table: `rsvp_invite_purchases`**
- id (uuid, pk)
- user_id (uuid, not null)
- event_id (uuid, not null)
- amount_paid (numeric, not null)
- guest_tier_label (text) -- e.g., "1-100 guests"
- stripe_session_id (text, nullable)
- stripe_payment_id (text, nullable)
- status (text, default 'pending') -- pending, completed, failed
- created_at (timestamptz)

RLS: Users can only view/create their own purchases.

**subscription_plans updates:**
- Update Starter plan: `duration_days` from 30 to 1
- Add `table_limit` column (integer, nullable, NULL = unlimited)
- Set Starter `table_limit` = 5

**Files to create/modify:**
- `src/hooks/useUserPlan.ts` -- New hook to fetch user's plan and check limits
- `src/components/Dashboard/RsvpActivationModal.tsx` -- New popup for RSVP payment
- `src/components/Dashboard/PlanExpiredModal.tsx` -- New popup for trial expiry
- `src/components/Dashboard/GuestListTable.tsx` -- Add guest limit enforcement
- `src/pages/Dashboard.tsx` -- Add plan expiry check on load
- `src/components/Dashboard/SendRsvpConfirmModal.tsx` -- Add purchase check before sending

