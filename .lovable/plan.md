# RSVP Overage — Step 1: Database Migration

This is the first of 3 steps. After you approve this migration, I'll proceed with (2) the $10 AUD Stripe price + edge function updates, then (3) the frontend hook + new overage modal.

## What this migration does

Updates the `rsvp_invite_purchases` table so each overage payment is its own row alongside the original tier purchase. The effective guest limit is then computed dynamically as:

```
effectiveLimit = purchased_limit  +  (SUM of overage_blocks across rsvp_overage rows) × 10
```

No `parent_purchase_id` — rows are linked by `event_id + user_id` only.

## New columns on `rsvp_invite_purchases`

- `purchase_type` — `'rsvp_tier'` (initial) or `'rsvp_overage'` (extra block). Default `'rsvp_tier'` so all existing rows are correctly classified.
- `purchased_limit` — guest limit unlocked by a tier row (e.g. 100, 200, 300…). Null on overage rows.
- `overage_blocks` — number of 10-guest blocks this overage row adds. Default 0; only populated on overage rows.
- `guest_count_at_purchase` — guest count snapshot at time of payment (metadata, both row types).

CHECK constraint enforces `purchase_type IN ('rsvp_tier','rsvp_overage')`.

## Index changes

The current partial unique index `uq_rsvp_invite_purchases_event` enforces "one completed row per event", which would block stacking overage rows. It is replaced with:

- `uq_rsvp_invite_purchases_event_tier` — UNIQUE on `event_id` WHERE `status='completed' AND purchase_type='rsvp_tier'` (still one tier per event, but unlimited overage rows)
- `idx_rsvp_invite_purchases_event_status_type` — lookup index for summing overage blocks per event

## SQL

```sql
ALTER TABLE public.rsvp_invite_purchases
  ADD COLUMN IF NOT EXISTS purchase_type text NOT NULL DEFAULT 'rsvp_tier',
  ADD COLUMN IF NOT EXISTS purchased_limit integer,
  ADD COLUMN IF NOT EXISTS overage_blocks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_count_at_purchase integer;

ALTER TABLE public.rsvp_invite_purchases
  DROP CONSTRAINT IF EXISTS rsvp_invite_purchases_purchase_type_check;
ALTER TABLE public.rsvp_invite_purchases
  ADD CONSTRAINT rsvp_invite_purchases_purchase_type_check
  CHECK (purchase_type IN ('rsvp_tier','rsvp_overage'));

DROP INDEX IF EXISTS public.uq_rsvp_invite_purchases_event;
CREATE UNIQUE INDEX uq_rsvp_invite_purchases_event_tier
  ON public.rsvp_invite_purchases (event_id)
  WHERE status = 'completed' AND purchase_type = 'rsvp_tier';

CREATE INDEX IF NOT EXISTS idx_rsvp_invite_purchases_event_status_type
  ON public.rsvp_invite_purchases (event_id, status, purchase_type);
```

## RLS / access rules

Unchanged — existing user-scoped policies on `rsvp_invite_purchases` already cover the new columns.

## Backfill

No backfill needed: every existing completed row defaults to `purchase_type='rsvp_tier'`, which matches reality. `purchased_limit` will stay null on historical rows; the hook will fall back to parsing `guest_tier_label` (existing logic in `getTierMaxFromLabel`) when `purchased_limit` is null, so nothing breaks for prior purchases.

## After approval

Once this migration runs cleanly, I'll move on to:
- **Step 2:** Create the $10 AUD overage Stripe product/price, update `create-checkout` to accept `overage_blocks` quantity, and update `verify-payment` to insert an `rsvp_overage` row.
- **Step 3:** Update `useRsvpPurchase` to compute `effectiveLimit` dynamically, and add the new `RsvpOverageModal` triggered from the guest list when over the limit.
