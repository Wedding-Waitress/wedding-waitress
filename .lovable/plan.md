
# Stripe Payment Integration for Wedding Waitress

## What We're Building

Connecting your live Stripe account to Wedding Waitress so users can purchase plans directly from the app. This covers both the **one-time plan purchases** (Essential, Premium, Unlimited) and the **monthly vendor subscriptions** (Vendor Pro).

---

## Step 1: Create Stripe Products and Prices

We'll create the following products in your live Stripe account to match your existing `subscription_plans` database table:

| Product Name | Price (AUD) | Type | Guest Limit |
|---|---|---|---|
| Essential Plan | $99 | One-time | 100 |
| Premium Plan | $149 | One-time | 300 |
| Unlimited Plan | $249 | One-time | Unlimited |
| Vendor Pro | $249/mo | Recurring (monthly) | Unlimited |

We will also create an RSVP Invite Bundle product with tiered pricing:

| RSVP Tier | Price (AUD) | Guest Range |
|---|---|---|
| RSVP 1-100 | $99 | 1-100 guests |
| RSVP 101-200 | $129 | 101-200 guests |
| RSVP 201-300 | $149 | 201-300 guests |
| RSVP 301-400 | $159 | 301-400 guests |
| RSVP 401-500 | $199 | 401-500 guests |
| RSVP 501-1000 | $299 | 501-1000 guests |

---

## Step 2: Create Edge Functions

### 2a. `create-checkout` Edge Function
- Accepts `price_id` and optional `event_id` from the frontend
- Authenticates the user via Supabase auth
- Finds or creates the Stripe customer by email
- Creates a Checkout Session (mode: `payment` for one-time plans, mode: `subscription` for Vendor Pro)
- Passes `event_id` in metadata for RSVP purchases
- Returns the checkout URL

### 2b. `verify-payment` Edge Function
- Called after the user returns from Stripe Checkout
- Verifies the Checkout Session status
- Updates the `user_subscriptions` table with the correct plan
- For RSVP purchases, inserts a record into `rsvp_invite_purchases`
- Returns success/failure

---

## Step 3: Frontend Integration

### 3a. Pricing/Upgrade Page or Modal
- Add a "Plans & Pricing" section accessible from the dashboard (or upgrade modal)
- Each plan shows a "Buy Now" button that calls the `create-checkout` edge function
- Redirects the user to Stripe Checkout in a new tab
- On return to success URL, calls `verify-payment` to confirm and update the subscription

### 3b. RSVP Activation Flow
- Update the existing `RsvpActivationModal` to call the `create-checkout` edge function with the correct RSVP tier price
- On successful payment, mark the event's RSVP as activated

### 3c. Success Page
- Create a `/payment-success` route that verifies the payment and shows a confirmation message
- Redirects back to the dashboard after a few seconds

---

## Step 4: Store Stripe Price IDs

Create a constants file (`src/lib/stripePrices.ts`) mapping each plan to its Stripe price ID. This keeps price references centralized and easy to maintain.

---

## Technical Details

- **No webhooks needed** -- we verify payment status on-demand when the user returns from checkout
- **Edge functions** use the `STRIPE_SECRET_KEY` already stored in your Supabase secrets
- **Security**: All edge functions authenticate the user via Supabase JWT before creating checkout sessions
- **Currency**: All prices in AUD matching your Stripe account configuration
- The existing `subscription_plans` table and `user_subscriptions` table stay as-is; we just update records after successful payment verification
- The `PlanExpiredModal` and `useUserPlan` hook continue to work as they do now, reading from the same database tables

---

## Sequence of Work

1. Create Stripe products and prices (using Stripe tools)
2. Create `create-checkout` edge function
3. Create `verify-payment` edge function
4. Create the `stripePrices.ts` constants file
5. Create the `/payment-success` page
6. Wire up the pricing UI and RSVP activation modal to use Stripe checkout
7. Test the full flow end-to-end
