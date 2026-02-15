

# Stripe Products, Prices & Database Updates

## Part 1: Database Updates

Update `team_members` from 1 to **2** for Essential, Premium, and Unlimited plans in the `subscription_plans` table.

No schema changes needed -- this is a data update only.

## Part 2: Create Stripe Products and Prices

### Wedding Plans (one-time payments)

| Product | Price (AUD) | Stripe Mode |
|---|---|---|
| Essential Plan -- Up to 100 guests | $99.00 | One-time |
| Premium Plan -- Up to 300 guests | $149.00 | One-time |
| Unlimited Plan -- Unlimited guests | $249.00 | One-time |

### Vendor Plan (recurring)

| Product | Price (AUD) | Stripe Mode |
|---|---|---|
| Vendor Pro -- Unlimited, 5 team members | $249.00/month | Subscription (monthly) |

Note: Vendor Pro purchases will require admin approval before activation. This logic will be handled in the `verify-payment` edge function and database (not in Stripe itself).

### RSVP Invite Bundle (one-time, per event)

| Product | Price (AUD) |
|---|---|
| RSVP Bundle -- 1-100 guests | $99.00 |
| RSVP Bundle -- 101-200 guests | $129.00 |
| RSVP Bundle -- 201-300 guests | $149.00 |
| RSVP Bundle -- 301-400 guests | $159.00 |
| RSVP Bundle -- 401-500 guests | $199.00 |
| RSVP Bundle -- 501-1000 guests | $299.00 |

All prices in **AUD**. Total: **4 plan products + 6 RSVP tier prices = 10 Stripe products/prices**.

## Part 3: Edge Functions

### `create-checkout` Edge Function
- Accepts `price_id`, `mode` (payment or subscription), and optional `event_id`
- Authenticates user via Supabase JWT
- Finds or creates Stripe customer by email
- Creates Checkout Session with appropriate mode
- Passes `event_id` and `plan_type` in session metadata
- Returns checkout URL

### `verify-payment` Edge Function
- Accepts `session_id` from the success page
- Retrieves the Checkout Session from Stripe
- If plan purchase: updates `user_subscriptions` with correct plan, sets `expires_at` to 12 months out (or 30 days for Vendor Pro)
- If Vendor Pro: sets a pending/approval-required status so admin must approve within 24 hours
- If RSVP purchase: inserts record into `rsvp_invite_purchases` with `status = 'completed'`
- Returns confirmation details

## Part 4: Frontend Files

### `src/lib/stripePrices.ts`
Constants file mapping each plan and RSVP tier to its Stripe price ID and product ID. Single source of truth for all Stripe references.

### `src/pages/PaymentSuccess.tsx`
- Reads `session_id` from URL query params
- Calls `verify-payment` edge function
- Shows confirmation message with plan details
- Auto-redirects to dashboard after 5 seconds
- Handles errors gracefully

### Route Addition in `App.tsx`
- Add `/payment-success` route

### Update `RsvpActivationModal.tsx`
- Wire "Pay Now" button to call `create-checkout` with the correct RSVP tier price ID
- Open Stripe Checkout in new tab

### Vendor Pro Admin Approval
- Add an `admin_approved` column (boolean, default false) to `user_subscriptions` if not present, or handle via the existing `status` field by setting it to `pending_approval` for Vendor Pro purchases
- Admin dashboard can then list pending vendor approvals and toggle activation

## Part 5: Strikethrough Pricing (UI only, later phase)
The marketing prices (~~$199~~ $99, ~~$299~~ $149, ~~$499~~ $249) will be implemented in the landing page and upgrade UI as a visual-only feature. This does not affect Stripe or the database -- purely frontend styling applied when displaying plan cards.

---

## Sequence of Implementation

1. Update database: set `team_members = 2` for Essential, Premium, Unlimited
2. Create all 10 Stripe products and prices
3. Create `src/lib/stripePrices.ts` with all price/product IDs
4. Create `create-checkout` edge function
5. Create `verify-payment` edge function
6. Add `supabase/config.toml` entries for new edge functions
7. Create `PaymentSuccess` page and add route to `App.tsx`
8. Wire `RsvpActivationModal` to use Stripe checkout
9. Add vendor approval logic (database + admin UI integration)

