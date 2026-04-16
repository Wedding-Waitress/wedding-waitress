

# Update Multi-Currency Pricing Values

## Summary
Update the price numbers in `src/lib/currencyPricing.ts` only. No logic, structure, or Stripe price ID changes.

## Changes (single file: `src/lib/currencyPricing.ts`)

**Wedding Plans — updated `price` values (originalPrice = 2x price):**

| Plan | USD | GBP | EUR |
|------|-----|-----|-----|
| Essential | 74.99 (was 69.99) | 64.99 (was 54.99) | 69.99 (was 64.99) |
| Premium | 104.99 (was 99.99) | 89.99 (was 79.99) | 99.99 (was 94.99) |
| Unlimited | 174.99 (was 169.99) | 149.99 (was 129.99) | 169.99 (was 159.99) |

**Vendor Pro Monthly:**

| Currency | New | Was |
|----------|-----|-----|
| USD | 179.99 | 169.99 |
| GBP | 149.99 | 129.99 |
| EUR | 169.99 | 159.99 |

**AUD pricing stays unchanged.**

`originalPrice` values will be updated to maintain the 2x marketing ratio (e.g., USD Essential: 149.99, GBP Essential: 129.99, etc.).

All Stripe `price_id` strings, logic, and UI remain untouched.

